const { body, validationResult } = require("express-validator"); 
const mongoose = require('mongoose');
const Vacante = mongoose.model('Vacante');

const multer = require('multer');
const shortid = require('shortid');

exports.formularioNuevaVacante = (req,res) => {
    res.render('nueva-vacante', {
        nombrePagina: 'Nueva Vacante',
        tagline: 'Llena el formulario y publica tu vacante',
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen
    });
};

//Agrega la vacante a la base de datos
exports.agregarVacante = async (req, res) => {
    const vacante = new Vacante(req.body);

    //Usuario Autor de la Vacante
    vacante.autor = req.user._id;
    
    //Crear arreglo de habilidades
    vacante.skills = req.body.skills.split(',');

    //Almacenarlo en la base de datos
    const nuevaVacante = await vacante.save();

    //Redireccionar
    res.redirect(`/vacantes/${nuevaVacante.url}`);
};

// muestra una vacante
exports.mostrarVacante = async (req,res,next) => {
    const vacante = await Vacante.findOne({url: req.params.url}).lean().populate('autor');

    console.log(vacante);

    //si no hay resultados
    if(!vacante) return next();

    res.render('vacante', {
        vacante,
        nombrePagina: vacante.titulo,
        barra: true
    });
};

exports.formEditarVacante = async (req,res,next) => {
    const vacante = await Vacante.findOne({url: req.params.url}).lean();

    if (!vacante) return next();

    res.render('editar-vacante',{
        vacante,
        nombrePagina: `Editar - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre
    });
};

exports.editarVacante = async (req, res, next) => {
    const vacanteActualizada = req.body;

    vacanteActualizada.skills = req.body.skills.split(',');

    const vacante = await Vacante.findOneAndUpdate({url: req.params.url}, vacanteActualizada, {
        new: true,
        runValidators: true
    });
    res.redirect(`/vacantes/${vacante.url}`);
};

//Validar y Sanitizar los campos de las nuevas vacantes
exports.validarVacante = async (req, res, next) => {
    //Sanitizar y validar los campos
    const rules = [
        body("titulo").escape(),
        body("empresa").escape(),
        body("ubicacion").escape(),
        body("salario").escape(),
        body("contrato").escape(),
        body("skills").escape(),
        body("titulo").not().isEmpty().withMessage("Agrega un título a la Vacante"),
        body("empresa").not().isEmpty().withMessage("Agrega una empresa"),
        body("ubicacion").not().isEmpty().withMessage("Agrega una ubicación"),
        body("skills").not().isEmpty().withMessage("Agrega al menos una habilidad")
      ];

      await Promise.all(rules.map((validation) => validation.run(req)));
      const errors = validationResult(req);
      console.log('holaaaaaaaa',errors);
      console.log(errors.isEmpty());
      if (!errors.isEmpty()) {
         // Recargar pagina con errores
         req.flash("error",errors.array().map((error) => error.msg));  

         res.render('nueva-vacante',{
            nombrePagina: 'Nueva Vacante',
            tagline: 'Llena el formulario y publica tu vacante',
            cerrarSesion: true,
            nombre: req.user.nombre,
            mensajes: req.flash()   
         });
         return;
      }

      next();
};

exports.eliminarVacante = async (req, res) => {
    const {id} = req.params;

    const vacante = await Vacante.findById(id);

    console.log(vacante);

    if(verificarAutor(vacante,req.user)){
        //Todo bien, si es el usuario, eliminar
        vacante.remove();
        res.status(200).send('Vacante Eliminada Correctamente');
    } else {
        //No permitido
        res.status(403).send('Error');
    }

};

const verificarAutor = (vacante={}, usuario={}) => {
    return !(!vacante.autor.equals(usuario._id));
};


//Opciones de Multer
const configuracionMulter = {
    limits: {fileSize: 100000}, 
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, __dirname+'../../public/uploads/cv');
        },
        filename: (req, file, cb) => {
            const extension = file.mimetype.split('/')[1];
            cb(null,`${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, cb) {
        if(file.mimetype === 'application/pdf'){
            //el callback se ejecuta como true o false: true cuando la imagen se acepta
            cb(null, true);
        } else {
            cb(new Error('Formato no válido'), false);
        }
    }   
};

const upload = multer(configuracionMulter).single('cv');

//Subir archivos PDF
exports.subirCV = (req,res,next)=>{
    upload(req, res, function(error){
        console.log('error1:',error);
        if(error){
            console.log('error2:',error.code);
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error','El archivo es muy grande: Máximo 100kb');
                } else {
                    req.flash('error', error.message);
                }
            } else {
                req.flash('error', error.message);  
            }
            res.redirect('back');
        } else {
            return next();
        }
    });
};

//Almacenar los candidatos en la BD
exports.contactar = async (req, res, next) => {
    const vacante = await Vacante.findOne({url: req.params.url});

    //si no existe la vacante
    if (!vacante) return next();

    //todo bien, construir el nuevo objeto físico
    const nuevoCandidato = {
        nombre: req.body.nombre,
        email: req.body.email,
        cv: req.file.filename
    }

    //Almacenar la vacante
    vacante.candidatos.push(nuevoCandidato);
    await vacante.save();

    //Mensaje flash y redirección
    req.flash('correo', 'Se envió tu Curriculum Correctamente');
    res.redirect('/');

};

exports.mostrarCandidatos = async (req, res, next) => {

    const vacante = await Vacante.findById(req.params.id).lean();
    console.log('Mostrar Vacante:', vacante);
    if (!vacante) return next();

    //console.log('eq.user._id.toString()', req.user._id.toString());
    //console.log('vacante.autor', vacante.autor);
    if (vacante.autor.toString() !== req.user._id.toString()){
        return next();
    }
    console.log('vacante.candidatos', vacante.candidatos);
    
    res.render('candidatos', {
        nombrePagina: `Candidatos Vacante - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        candidatos: vacante.candidatos
    })

};

//Buscador de Vacantes
exports.buscarVacantes = async (req, res) => {
    console.log('buscarVacantes:');
    const vacantes = await Vacante.find({
        $text: {
            $search: req.body.q
        }
    });
    //Mostrar las vacantes
    res.render('home', {
        nombrePagina: `Resultados para la búsqueda: ${req.body.q}`,
        barra: true,
        vacantes
    });
};