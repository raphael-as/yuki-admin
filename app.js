const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(`${process.env.MONGO}`)
  .then(() => {
    console.log('Connexion à la base de données réussie.');
  })
  .catch((error) => {
    console.error('Erreur de connexion à la base de données:', error);
  });

// Models
const User = require('./models/User.js');
const Event = require('./models/Event.js');


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.use(express.static("views"))

app.get('/signup', (req, res) => {
  res.send(`
    <h1>Inscription</h1>
    <form method="post" action="/signup">
      <div>
        <label for="username">Nom d'utilisateur :</label>
        <input type="text" name="username" id="username">
      </div>

<div>
<label for="email">Email :</label>
<input type="email" name="email" id="email">
</div>

      <div>
        <label for="password">Mot de passe :</label>
        <input type="password" name="password" id="password">
</div>

<div>
<label for="post">Son poste:</label>
<select id="post" name="post" size="4">
<option value="Fondateur">Fondateur</option>
<option value="Technicien">Technicien</option>
<option value="Développeur">Développeur</option>
<option value="Community Manager">Community Manager</option>
<option value="Graphiste">Graphiste</option>
<option value="Trésorier">Trésorier</option>
<option value="Stagiaire">Stagiaire</option>
<option value="Support Client">Support Client</option>
</select>
</div>

<div>
<label for="perm">Permission administrateur :</label>
<select id="perm" name="perm" size="3">
<option value="false">Non</option>
<option value="true">Oui</option>
</select>
      </div>

      <div>
        <button type="submit">S'inscrire</button>
      </div>
    </form>
  `);

});

app.post('/signup', async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const role = req.body.post;
  const password = req.body.password;
  const admin= req.body.perm;
  const pfp = "https://pixy.org/src/120/thumbs350/1206832.jpg";
  const hash = bcrypt.hashSync(password, 10);

  const userExists = await User.exists({ email: email });
if (userExists) {
  return res.status(409).json({ message: 'Cette adresse email est déjà utilisée.' });
} else {
  const newUser = new User({
  name: username,
  email: email,
  password: hash,
  pfp: pfp,
  role: role
});
    res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
  const OrgName = process.env.ORGNAME;
  const OrgLogo = process.env.ORGLOGO;

  res.render('login', { OrgName: OrgName, OrgLogo: OrgLogo })
});

app.post('/login', async (req, res) => {

  const email = req.body.email;
  const password = req.body.password;
  const user = await User.findOne({ email });

  if (!user) {
    return res.send('Nom d\'utilisateur incorrect');
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.send('Mot de passe incorrect');
  }

  req.session.user = user.name;
  res.redirect('/');

});

app.get('/', async (req, res) => {

  if (!req.session.user) {
    return res.redirect('/login');
  }

  const name = req.session.user;
  const user = await User.findOne({ name });
  const OrgName = process.env.ORGNAME;
  const OrgLogo = process.env.ORGLOGO;

  res.render('./workspace/home', { OrgName: OrgName, user: user, OrgLogo: OrgLogo })
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Agenda
 app.get('/events/new', (req, res) => {
  res.render('./workspace/agenda-new');
});

app.post('/events', (req, res) => {
  const event = new Event({
      title: req.body.title,
      start: new Date(req.body.start),
      end: new Date(req.body.end)
  });
  event.save()
  console.log(event)
  res.redirect('/agenda')
});



app.get('/agenda', async (req, res) => {
  try {
    const events = await Event.find().sort({ start: 'asc' });
    res.render('./workspace/agenda', { events });
  } catch (err) {
    console.error(err);
    res.status(500).send("Une erreur s'est produite lors de la récupération des événement.");
  }
});

// Lancement
app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});