const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController.js');
const vacantesController = require('../controllers/vacantesController.js');
const usuariosController = require('../controllers/usuariosController.js');
const authController = require('../controllers/authController.js');

const {body} = require('express-validator');

module.exports = () => {
    router.get('/',homeController.mostrarTrabajos);

    //Crear Vacantes
    router.get('/vacantes/nueva', 
        authController.verificarUsuario,
        vacantesController.formularioNuevaVacante);

    router.post('/vacantes/nueva', 
        authController.verificarUsuario,
        vacantesController.validarVacante,
        vacantesController.agregarVacante);

    //Mostrar Vacante (Singular)
    router.get('/vacantes/:url', vacantesController.mostrarVacante);

    //Editar Vacante
    router.get('/vacantes/editar/:url',
        authController.verificarUsuario,
        vacantesController.formEditarVacante);

    //Eliminar Vacante
    router.delete('/vacantes/eliminar/:id',
        vacantesController.eliminarVacante
    );    

    router.post('/vacantes/editar/:url',
        authController.verificarUsuario,
        vacantesController.validarVacante,
        vacantesController.editarVacante);
    
    //Crear cuentas
    router.get('/crear-cuenta', usuariosController.formCrearCuenta);
    router.post('/crear-cuenta',
        //Sanitizar
        body('nombre').escape(),
        body('email').escape(),
        body('password').escape(),
        body('confirmar').escape(),
        //Validar
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('password').notEmpty().withMessage('El password no puede ir vacío'),
        body('confirmar').notEmpty().withMessage('Confirmar password no puede ir vacío'),
        body('email').isEmail().withMessage('El email debe ser válido'),
        body('confirmar').custom((value, { req }) => {
            if (value !== req.body.password) {
              throw new Error('La confirmación del password no coincide con el password');
            }
            return true;
          }),
     usuariosController.validarRegistro, 
     usuariosController.crearUsuario);

     // Autenticar Usuarios
    router.get('/iniciar-sesion',usuariosController.formIniciarSesion); 
    router.post('/iniciar-sesion',authController.autenticarUsuario); 
    //Cerrar Sesión
    router.get('/cerrar-sesion',
      authController.verificarUsuario,
      authController.cerrarSesion  
    );

    //Reestablecer Password (Email)
    router.get('/reestablecer-password', authController.formReestablecerPassword);      
    router.post('/reestablecer-password', authController.enviarToken);    
    
    //Resetear password (Almacenar en la BD)
    router.get('/reestablecer-password/:token',authController.reestablecerPassword);
    router.post('/reestablecer-password/:token',authController.guardarPassword);

    // Panel de Administración
    router.get('/administracion', 
        authController.verificarUsuario,  
        authController.mostrarPanel);

    //Editar Perfil
    router.get('/editar-perfil',
        authController.verificarUsuario,
        usuariosController.formEditarPerfil
    );    
    
    router.post('/editar-perfil', 
        authController.verificarUsuario,
        usuariosController.validarPerfil,
        usuariosController.subirImagen,
        usuariosController.editarPerfil 
    );

    //Recibir Mensajes de Candidatos
    router.post('/vacantes/:url', 
          vacantesController.subirCV,
          vacantesController.contactar
    );

    //Muestra los candidatos por vacante
    router.get('/candidatos/:id',
          authController.verificarUsuario,
          vacantesController.mostrarCandidatos
    );

    //Buscador de Vacantes
    router.post('/buscador', vacantesController.buscarVacantes);      

    return router;
};