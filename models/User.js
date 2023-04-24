const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    pfp: { type: String, default: "https://pixy.org/src/120/thumbs350/1206832.jpg" },
    banner: { type: String, default: "https://i.pinimg.com/originals/fc/ca/70/fcca70464e4b77c80aa444e1c2120124.jpg" },
    bio: { type: String, default: "Aucune Bio définie"},
    role: String,
    admin: { type: String, default: "false"},
}, { collation: { locale: 'en', strength: 2 }
   });


const User = mongoose.model('User', userSchema);
module.exports = User;