const mongoose = require('mongoose');
mongoose.Promise= global.Promise;

const bcrypt = require('bcrypt');

const usuariosSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    nombre: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    token: String,
    expira: Date,
    imagen: String
});

//Método para hashear los passwords
usuariosSchema.pre('save', async function(next){
    //Si el password ya está hasheado 
    if(!this.isModified('password')){
        return next(); // deten la ejecución
    }
    //Si no esta hasheado
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
});

//Envia alerta cuando un usuario ya esta registrado
usuariosSchema.post('save', function(error,doc,next){
    if(error.name === 'MongoServerError' && error.code === 11000) {
        next('Ese correo ya esta registrado');
    } else {
        next(error);
    }
});

//Autenticar usuarios
usuariosSchema.methods = {
    compararPassword: function(password){
        return bcrypt.compareSync(password, this.password);
    }
}

module.exports = mongoose.model('Usuarios', usuariosSchema);