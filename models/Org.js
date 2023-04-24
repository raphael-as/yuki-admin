const mongoose = require('mongoose');

const orgSchema = new mongoose.Schema({
  name: { type: String, default: "Yuki Studio"},
  logo: { type: String, default: "https://cdn.discordapp.com/attachments/1087480206819868682/1091080297434599464/20230329_102437.jpg" },
  email: {
    host: { type: String, default: "Aucun Host définie" },
	port: { type: Number, default: "587" },
    user: { type: String, default: "Aucune Email définie" },
    mdp: { type: String, default: "Aucun Mot de passe définie" }
  }
});

const Org = mongoose.model('Organisation', orgSchema);
module.exports = Org;
