
const passport = require('passport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Vacante = mongoose.model('Vacante');
const Usuarios = mongoose.model('Usuarios');
const enviarEmail = require('../handler/email');

exports.autenticarUsuario = passport.authenticate('local', {
    successRedirect: '/administracion',
    failureRedirect: '/iniciar-sesion',
    failureFlash: true,
    badRequestMessage: 'Ambos campos son obligatorios' 
});

exports.verificarUsuario = (req,res,next) => {
    //Revisar el usuario
    if(req.isAuthenticated()){
        return next();//Están autenticados
    }
    //redireccionar
    res.redirect('/iniciar-sesion');
};

exports.mostrarPanel = async (req, res) => {

    //Consultar el usuario autenticado
    const vacantes = await Vacante.find({autor: req.user._id}).lean();
    console.log(req.user.imagen);

    res.render('administracion', {
        nombrePagina: 'Panel de Administración',
        tagline: 'Crea y Administra tus vacantes desde Aquí',
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        vacantes
    });
};

exports.cerrarSesion = (req, res, next) => {
    req.logout(function(error){
        if(error){return next(error);}
    });
    req.flash('correcto','Cerraste Sesión Correctamente');
    return res.redirect('/iniciar-sesion');
    
};

//Formulario para reesteblacer password
exports.formReestablecerPassword = (req,res) => {
    res.render('reestablecer-password', {
        nombrePagina: 'Reestablece tu Password',
        tagline: 'Si ya tienes una cuenta pero olvidaste tu password, coloca tu email'
    });
};

//Genera el token en la tabla de usuario
exports.enviarToken = async (req, res) => {
    const usuario = await Usuarios.findOne({email: req.body.email});

    if(!usuario){
        req.flash('error', 'No existe esa cuenta');
        return res.redirect('/iniciar-sesion');
    }
    //el usuario existe, generar token
    usuario.token = crypto.randomBytes(20).toString('hex');
    usuario.expira = Date.now() + 3600000;

    //Guardar el usuario
    await usuario.save();
    const resetUrl = `http://${req.headers.host}/reestablecer-password/${usuario.token}`;
    console.log(resetUrl);
    
    //Enviar notificación por Email
    await enviarEmail.enviar({
        usuario,
        subject: 'Password Reset',
        resetUrl,
        archivo: 'reset'
    });
    // Todo Correcto
    req.flash('correcto', 'Revisa tu email para las indicaciones');
    res.redirect('/iniciar-sesion');
};

//Valida si el token es valido y el usuario existe, muestra la vista
exports.reestablecerPassword = async (req, res) => {
    const usuario = await Usuarios.findOne({
        token: req.params.token,
        expira: {
            $gt: Date.now()
        }
    });

    if(!usuario){
        req.flash('error','El formulario ya no es valido, intenta de nuevo');
        return res.redirect('/reestablecer-password');
    }

    //Todo bien, mostrar el formulario
    res.render('nuevo-password',{
        nombrePagina: 'Nuevo Password'
    });

};

//Almacena el nuevo password en la BD
exports.guardarPassword = async (req, res) => {
    const usuario = await Usuarios.findOne({
        token: req.params.token,
        expira: {
            $gt: Date.now()
        }
    });

    //No existe el usuario o el token es inválido
    if(!usuario){
        req.flash('error','El formulario ya no es valido, intenta de nuevo');
        return res.redirect('/reestablecer-password');
    }
    //Asignar nuevo password, limpiar valores previos
    usuario.password = req.body.password;
    usuario.token = undefined;
    usuario.expira = undefined;

    //Agregar y eliminar valores del objeto
    await usuario.save();

    //Redirigir
    req.flash('correcto','Password Modificado Correctamente');
    res.redirect('/iniciar-sesion');
};
