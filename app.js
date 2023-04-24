const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const nodemailer = require('nodemailer');
const flash = require('connect-flash');
const cron = require('node-cron');
const favicon = require('serve-favicon');

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
const Message = require('./models/Message.js');
const Org = require('./models/Org.js');
const RandomNumber = require('./models/randomNumber');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.use(express.static("views"))
app.use(flash());


// 1er Demarage
async function createOrg() {
  const existingOrg = await Org.findOne();
  const existingUser = await User.findOne();
    
  if (!existingOrg) {
      const newOrg = new Org({
      name: `${process.env.ORGNAME}`,
      pfp: `${process.env.ORGLOGO}`
  });
  await newOrg.save();
    console.log("L'Organisation a ete cree !")
  }
    
  if(!existingUser) {
    const email = `${process.env.ADMINEMAIL}`;
    const username = `${process.env.ADMINUSER}`;
    const password = `${process.env.ADMINMDP}`;
    const hash = bcrypt.hashSync(password, 10);
    const role = `${process.env.ADMINROLE}`;
    const admin = "true";
    
    const newUser = new User({
  name: username,
  email: email,
  password: hash,
  role: role,
  admin: admin
});
await newUser.save();
    console.log('User a ete cree !');
}
}
createOrg();



async function generateAndSaveRandomNumber() {
 const prefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const randomNumber = Math.floor(Math.random() * 1679616).toString(36);
const uniqueNumber = `${prefix}-${randomNumber}`;
const existingNumber = await RandomNumber.findOne();

  if (existingNumber) {
    existingNumber.value = uniqueNumber;
    await existingNumber.save();
  } else {
    const newNumber = new RandomNumber({ value: uniqueNumber });
    await newNumber.save();
  }
}

generateAndSaveRandomNumber();
cron.schedule('0 0 * * *', generateAndSaveRandomNumber);


app.get('/login', async (req, res) => {
    const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;

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

})

   //home
app.get('/', async (req, res) => {

  if (!req.session.user) {
    return res.redirect('/login');
  }

  const name = req.session.user;
  const user = await User.findOne({ name });
  const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;
  const now = Date.now();
  const events = await Event.find();
  
  for (const event of events) {
    if (event.end <= now) {
      await event.deleteOne();
    }
  }
  const eventsCount = events.length;
    
      let divorg;
    divorg = `<div id="org"> <a href="/org"><div class="channel__content"> <img src="${org.logo}" height="75px" width="75px" style="border-radius: 50%; margin-top: 10px;"></div></a> </div>`;
    if (`${user.admin}` !== "true") {
        divorg = '';
    }
  res.render('./workspace/home', { eventsCount: eventsCount, OrgName: OrgName, userpfp: user.pfp, username: user.name, OrgLogo: OrgLogo, divorg: divorg })
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Agenda

app.post('/events', (req, res) => {
  const event = new Event({
      title: req.body.title,
      start: new Date(req.body.start),
      end: new Date(req.body.end)
  });
  event.save();
  res.redirect('/agenda')
});



app.get('/agenda', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const name = req.session.user;
  const user = await User.findOne({ name });
 const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;
  try {
    const now = Date.now();
    const events = await Event.find();
    
    for (const event of events) {
      if (event.end <= now) {
        await event.deleteOne();
      }
    }
    const eventsCount = events.length;
       let divorg;
    divorg = `<div id="org"> <a href="/org"><div class="channel__content"> <img src="${org.logo}" height="75px" width="75px" style="border-radius: 50%; margin-top: 10px;"></div></a> </div>`;
    if (`${user.admin}` !== "true") {
        divorg = '';
    }
    const listEvents = await Event.find().sort({ start: 'asc' });
    res.render('./workspace/agenda', { eventsCount: eventsCount, events: listEvents,  OrgName: OrgName, userpfp: user.pfp, divorg: divorg, OrgLogo: OrgLogo });
  } catch (err) {
    console.error(err);
    res.status(500).send("Une erreur s'est produite lors de la récupération des événement.");
  }
});

//Message
app.get('/chat', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const name = req.session.user;
  const user = await User.findOne({ name });
  const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;
  const now = Date.now();
  const events = await Event.find();
    for (const event of events) {
      if (event.end <= now) {
        await event.deleteOne();
      }
    }
    const eventsCount = events.length;
    const messages = await Message.find().sort({ date: 1 }).limit(50);
    
     let divorg;
    divorg = `<div id="org"> <a href="/org"><div class="channel__content"> <img src="${org.logo}" height="75px" width="75px" style="border-radius: 50%; margin-top: 10px;"></div></a> </div>`;
    if (`${user.admin}` !== "true") {
        divorg = '';
    }
  res.render("./workspace/chat", { msgs: messages, eventsCount: eventsCount, username: user.name, OrgName: OrgName, userpfp: user.pfp, OrgLogo: OrgLogo, divorg: divorg, messages: messages});

io.once('connection', (socket) => {
  socket.on('chat message', async (msg, txt) => {
    const mesg = new Message({
      user: user.name,
      pfp: user.pfp,
      txt: txt
    });
    mesg.save();
    io.emit('chat message', msg);
  });
});

});

// Voc 
app.get('/voc', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const name = req.session.user;
  const user = await User.findOne({ name });
  const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;
  const now = Date.now();
  const events = await Event.find();
    for (const event of events) {
      if (event.end <= now) {
        await event.deleteOne();
      }
    }
    const eventsCount = events.length;
     let divorg;
    divorg = `<div id="org"> <a href="/org"><div class="channel__content"> <img src="${org.logo}" height="75px" width="75px" style="border-radius: 50%; margin-top: 10px;"></div></a> </div>`;
    if (`${user.admin}` !== "true") {
        divorg = '';
    }
    const randomNumber = await RandomNumber.findOne();

    
  res.render("./workspace/voc", { nbr: randomNumber.value, eventsCount: eventsCount, username: user.name, divorg: divorg, OrgName: OrgName, userpfp: user.pfp, OrgLogo: OrgLogo });
    });

// User Settings
app.get('/user', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
    
  const name = req.session.user;
  const user = await User.findOne({ name });
  const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;
  const now = Date.now();
  const events = await Event.find();
    for (const event of events) {
      if (event.end <= now) {
        await event.deleteOne();
      }
    }
    const eventsCount = events.length;
     let divorg;
    divorg = `<div id="org"> <a href="/org"><div class="channel__content"> <img src="${org.logo}" height="75px" width="75px" style="border-radius: 50%; margin-top: 10px;"></div></a> </div>`;
    if (`${user.admin}` !== "true") {
        divorg = '';
    }
  res.render("./workspace/user-settings", { eventsCount: eventsCount, UserName: user.name, OrgName: OrgName, UserPfp: user.pfp, UserBanner: user.banner, UserBio: user.bio, UserEmail: user.email, divorg: divorg, OrgLogo: OrgLogo });
    });

app.post("/user", async (req, res) => {
    const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.redirect('/login');
  }
  const user = await User.findOne({ name: sessionUser });

  if (!user) {
    return res.status(404).send('Utilisateur non trouvé');
  }
    
  const { banner, pfp, nom, bio, email, mdp, nmdp } = req.body;
   
    if (!bcrypt.compareSync(mdp, user.password)) {
    return res.status(401).send('Mot de passe incorrect');
  }

  user.banner = banner;
  user.pfp = pfp;
  user.name = nom;
  user.bio = bio;
  user.email = email;

  if (nmdp) {
const hash = bcrypt.hashSync(nmdp, 10);
    user.password = hash;
  }

  await user.save();
  await res.redirect('/login');

});
// Profile
app.get('/profile/:username', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
    
  const target = await User.findOne({ name: req.params.username });
    
  if (!target) {
    return res.status(404).send("Désolé, cette page est introuvable.");
  }

  const OrgName = process.env.ORGNAME;
  const OrgLogo = process.env.ORGLOGO;
  const now = Date.now();
  const events = await Event.find();
  
  for (const event of events) {
    if (event.end <= now) {
      await event.deleteOne();
    }
  }
  
  const eventsCount = events.length;
  
  res.render("./workspace/profile", { 
    eventsCount: eventsCount, UserName: target.name, OrgName: OrgName, UserPfp: target.pfp, UserBanner: target.banner, UserBio: target.bio, UserRole: target.role, OrgLogo: OrgLogo });
});

// Email
app.get('/email', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const name = req.session.user;
  const user = await User.findOne({ name });
  const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;
  const now = Date.now();
  const events = await Event.find();
    for (const event of events) {
      if (event.end <= now) {
        await event.deleteOne();
      }
    }
    const eventsCount = events.length;
     let divorg;
    divorg = `<div id="org"> <a href="/org"><div class="channel__content"> <img src="${org.logo}" height="75px" width="75px" style="border-radius: 50%; margin-top: 10px;"></div></a> </div>`;
    if (`${user.admin}` !== "true") {
        divorg = '';
    }
  res.render("./workspace/email", { eventsCount: eventsCount, username: user.name, divorg: divorg, OrgName: OrgName, UserPfp: user.pfp, OrgLogo: OrgLogo });
    });

app.post("/email", async (req, res) => {
    const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.redirect('/login');
  }
      const {email, sujet, message } = req.body;
    const org = await Org.findOne();
    
   const transporter = nodemailer.createTransport({
  host: `${org.email.host}`,
  port: `${org.email.port}`,
  secure: false,
  auth: {
    user: `${org.email.email}`,
    pass: `${org.email.mdp}`,
  },
});

    const msg = {
  from: `${org.email.email}`,
  to: `${email}`,
  subject: `${sujet}`,
  html: `${message}`,
};
    

  transporter.sendMail(msg, (error, info) => {
    if (error) {
        res.send(`une erreur est survenue ! \n ${error}`)
    } else {
        res.end('E-mail envoyé !');
    }
});

});

// Org settings
app.get('/org', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
    
  const name = req.session.user;
  const target = await User.findOne({ name });
    if (`${target.admin}` !== "true") {
        return res.redirect('/')
    }
    
    const users = await User.find().sort({ admin: -1 });
    
  const org = await Org.findOne();
  const now = Date.now();
  const events = await Event.find();
    for (const event of events) {
      if (event.end <= now) {
        await event.deleteOne();
      }
    }
    const eventsCount = events.length;
  res.render("./workspace/settings", { eventsCount: eventsCount,OrgName: org.name, UserPfp: target.pfp, OrgLogo: org.logo, OrgHost: org.email.host, OrgEmail: org.email.user, OrgMdp: org.email.mdp, OrgPort: org.email.port, users: users, sessionUser: target.name});
});

app.post("/org", async (req, res) => {
    const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.redirect('/login');
  }
  const org = await Org.findOne();
    
  if (!org) {
    return res.status(404).send('Organisation non trouvé');
  }
    
  const { logo, nom, host, email, mdp, port } = req.body;
 

  org.logo = logo;
  org.name = nom;
  org.email.host = host;
  org.email.port = port;
  org.email.user = email;
  org.email.mdp = mdp;

  await org.save();
  await res.redirect('/org');

});

app.post("/new-user", async (req, res) => {
    const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.redirect('/login');
  }
      const { username, email, password, post, perm } = req.body;
    
 const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('Un utilisateur avec cet email existe déjà');
  }
    const hash = bcrypt.hashSync(password, 10);
    const user = new User({
      name: username,
      admin: perm,
      role: post,
      email: email,
      password: hash,  
  });
  await user.save();
  await res.redirect('/org');

});

app.get('/delete/:id', async (req, res) => {
    const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.redirect('/login');
  }
    
  const name = req.session.user;
  const target = await User.findOne({ name });
    if (`${target.admin}` !== "true") {
        return res.redirect('/')
    }
    
  const org = await Org.findOne();
  const OrgName = org.name;
  const OrgLogo = org.logo;
  const now = Date.now();
  const events = await Event.find();
    for (const event of events) {
      if (event.end <= now) {
        await event.deleteOne();
      }
    }
    
  const user = await User.findOne({ name: req.params.id });

  if (!user) {
    res.status(404).send('Utilisateur non trouvé');
  }
 const eventsCount = events.length;
  res.render("./workspace/delete", { eventsCount: eventsCount,OrgName: org.name, UserPfp: target.pfp, OrgLogo: org.logo, OrgHost: org.email.host, OrgEmail: org.email.user, OrgMdp: org.email.mdp, user: user.name});
});

app.post('/delete/:id', async (req, res) => {
    const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.redirect('/login');
  }
    
  const user = await User.findOne({ name: req.params.id });


  if (!user) {
    res.status(404).send('Utilisateur non trouvé');
  }

  if (req.body.confirmation !== 'SUPPRIMER') {
    req.flash('error', 'Vous devez écrire "SUPPRIMER" en majuscules pour confirmer la suppression.');
    return res.redirect(`/delete/${user.name}`);
  }

  await User.deleteOne({ name: req.params.id });
  req.flash('success', 'L\'utilisateur a été supprimé avec succès.');
  res.redirect('/org');
});

// Lancement
server.listen(`${process.env.PORT}`, () => {
  console.log('Le workspace est fonctionel avec le port *:${process.env.PORT}');
})