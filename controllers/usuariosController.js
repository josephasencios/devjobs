const { body, check, validationResult } = require('express-validator');

const mongoose = require('mongoose');
const Usuarios = mongoose.model('Usuarios');
const multer = require('multer');
const shortid = require('shortid');

exports.subirImagen = (req, res, next)=>{
    
    upload(req, res, function(error){
        if(error){
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error','El archivo es muy grande: Máximo 100kb');
                } else {
                    req.flash('error', error.message);
                }
            } else {
                req.flash('error', error.message);  
            }
            res.redirect('/administracion');
        } else {
            return next();
        }
    });
    
};

//Opciones de Multer
const configuracionMulter = {
    limits: {fileSize: 100000}, 
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, __dirname+'../../public/uploads/perfiles');
        },
        filename: (req, file, cb) => {
            const extension = file.mimetype.split('/')[1];
            cb(null,`${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, cb) {
        if(file.mimetype === 'image/jpeg' || file.mimetype ==='image/png'){
            //el callback se ejecuta como true o false: true cuando la imagen se acepta
            cb(null, true);
        } else {
            cb(new Error('Formato no válido'), false);
        }
    }   
};

const upload = multer(configuracionMulter).single('imagen');



exports.formCrearCuenta = (req,res) => {
    res.render('crear-cuenta', {
        nombrePagina: 'Crea tu cuenta en devJobs',
        tagline: 'Comienza a publicar tus vacantes gratis, sólo debes crear una cuenta'
    });
};
exports.crearUsuario = async (req,res,next) => {
    //crear el usuario
    const usuario = new Usuarios(req.body);

    try {
        await usuario.save();
        res.redirect('iniciar-sesion');
    } catch (error) {
        req.flash('error', error);
        res.redirect('/crear-cuenta');
    }

};

exports.validarRegistro = (req, res, next) => {
    
    //Sanitizar campos del formulario
    console.log(req.body);

    //Validación
    let resultado = validationResult(req);  

    if (!resultado.isEmpty()){
        //Si hay errorres
        let errores = resultado.array();
        req.flash('error', errores.map(error=>error.msg));
        res.render('crear-cuenta', {
            nombrePagina: 'Crea tu cuenta en devJobs',
            tagline: 'Comienza a publicar tus vacantes gratis, sólo debes crear una cuenta',
            mensajes: req.flash()
        });
        return;
    }
    //Si toda la validación es correcta
    next();
};

// Formulario para iniciar sesión
exports.formIniciarSesion = (req, res) => {
    res.render('iniciar-sesion', {
        nombrePagina: 'Iniciar Sesión devJobs'
    });
};

//Form Editar perfil
exports.formEditarPerfil = (req, res)=> {
 
    res.render('editar-perfil', {
        nombrePagina: 'Edita tu perfil en devJobs',
        usuario: req.user,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen
    });
};

// Guardar cambios editar perfil
exports.editarPerfil = async (req, res)=>{
    const usuario = await Usuarios.findById(req.user._id);

    usuario.nombre = req.body.nombre;
    usuario.email = req.body.email;

    if(req.body.password){
        usuario.password = req.body.password;
    }

    if(req.file){
        usuario.imagen = req.file.filename;
    }

    await usuario.save();

    req.flash('correcto','Cambios Guardados Correctamente');

    res.redirect('/administracion');
};

//Sanitizar y validar formulario de editar perfiles
exports.validarPerfil = async (req,res,next) => {
    //Sanitizar y validar los campos
    const rules = [
        body("nombre").escape(),
        body("email").escape(),
        body("nombre").not().isEmpty().withMessage("El nombre no puede ir vacío"),
        body("email").not().isEmpty().withMessage("El E-mail no puede ir vacío"),        
      ];

      if (req.body.password){
         rules.push(
            body("email").escape()
         );
      }

      await Promise.all(rules.map((validation) => validation.run(req)));

      const errors = validationResult(req);

      if (errors) {
        // Recargar pagina con errores
        req.flash("error",errors.array().map((error) => error.msg));  

        res.render('editar-perfil',{
           nombrePagina: 'Edita tu perfil en devJobs',
           usuario: req.user,
           cerrarSesion: true,
           nombre: req.user.nombre,
           imagen: req.user.imagen,
           mensajes: req.flash()   
        });
        return;
     }

     next();
};


