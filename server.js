require('dotenv').config();

const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');
const path = require('path');

const { SERVER_PORT, JWT_SECRET_KEY, JWT_EXP_TIME } = process.env;

const server = jsonServer.create();
const router = jsonServer.router('./db.json');
const middlewares = jsonServer.defaults({
  static: path.join(__dirname, 'public')
});

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Route pour visualiser les produits
server.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'display/index.html'));
});

// Route Login
server.post('/login', (req, res) => {
  // on vérifie si l'utilisateur est dans la BDD
  const user = getUser(req.body);

  if (!user) {
    const status = 401;
    const message = 'Identifiants incorrects. Merci de ré-essayer.';

    return res.status(status).json({ status, message });
  }

  // l'utilisateur est authentifié…
  // on génère le token
  const accessToken = createToken({ sub: user.id });
  // on combine les infos utilisateur et le token
  const data = {
    ...user,
    accessToken,
  };
  // on supprime le mot de passe dans les données renvoyées
  delete data.password;
  // on retourne les infos utilisateur (sans le password)
  return res.status(200).json(data);
});

// Route Panier
server.get('/cart', (req, res) => {
  // Vérification du token
  const { authorization } = req.headers;
  if (authorization) {
    const [, token] = authorization.split(' ');
    try {
      // on récupère les données en fonction de l'ID de l'utilisateur
      // userId à partir du payload du token
      const { sub } = jwt.verify(token, JWT_SECRET_KEY);
      // requête
      const cartItems = getCartByUserId(sub);
      
      return res.status(200).json(cartItems);
    } catch (err) {
      console.log('Token invalide', err);
    }
  }

  res.status(200).json([]);
});

server.use(router);

server.listen(SERVER_PORT, () => {
  console.log(`JSON Server is running on http://localhost:${SERVER_PORT}`);
});

function getUser({ email, password }) {
  const users = router.db.get('users').value();
  return users.find((u) => u.email === email && u.password === password);
}

function getCartByUserId(userId) {
  const cartItems = router.db.get('carts').filter({ userId }).value();
  
  return cartItems.map((i) => {
    return router.db.get('products').find({ id: i.productId }).value();
  });  
}

function createToken(payload) {
  return jwt.sign(
    payload,
    JWT_SECRET_KEY,
    { expiresIn: JWT_EXP_TIME },
  );
}
