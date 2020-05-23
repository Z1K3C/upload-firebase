const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const path = require('path');
const session = require('express-session');   
const multer = require('multer');
const { v4: uuidv4 } = require('uuid'); 
const { remove } = require('fs-extra');

const admin = require("firebase-admin");
const serviceAccount = require("./googlekey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://proyecto1-61b87.firebaseio.com"
});

const bucket = admin.storage().bucket("gs://proyecto1-61b87.appspot.com");
const firedb = admin.database();



const app = express();

app.use(bodyParser.json());
app.use(session({                                               
  secret: 'secret',                                  
  resave: true,                                       
  saveUninitialized: true                             
}));
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/upload'),
  filename(req, file, cb) {
    //const d = moment().format('x');
    //cb(null, d.toString() + path.extname(file.originalname));
    cb(null, file.originalname);
  }
});
app.use(multer({storage}).array('fieldname[]',[10])); 

app.post('/upload',async (req, res) => {

  let error = 0;
  let err_msg = "";
  let filesgroup = [];
  let clave = false;
  if (!req.files) {
    error++;
  }else{
    const files = req.files || false;
    const qty = files.length || false;
    const copyf = req.body.fieldqty || false;
    if((!qty)&&(!copyf)){
      error++;
    }else{
      if(qty > 5){
        error++;
      }else{

        for (let i = 0; i < qty; i++) {
          const destination = moment().format('DDDD') + '/' + req.sessionID + '/' + files[i]['filename'];
          const options = {
            destination: destination,
            resumable: true,
            public: true,
            validation: 'crc32c'
          };
          try {
            const res2 = await bucket.upload(files[i]['path'], options);
            if(res2){
              try {
                const res3 = remove(path.resolve('./public/upload/' + files[i]['filename']));
                if(res3){
                  filesgroup.push({path: destination,copys: req.body.fieldqty[i]});
                }else{
                  error++;
                }
              } catch (error) {
                error++;
                err_msg = error;
              }
            }else{
              error++;
            }
          } catch (error) {
            error++;
            err_msg = error;
          }
  
        }
  
        if(!error){
          const uuidclient = uuidv4();
          clave = uuidclient.slice(0,8);
          clave = clave.toUpperCase();
          const clientinfo = {
            id: req.sessionID,
            uuid: uuidclient,
            clave: clave,
            files: filesgroup
          }
          try {
            const res4 = await firedb.ref(clave).set(clientinfo);
          } catch (error) {
            error++;
            err_msg = error;
          }
        }

      }

    }
  }

  if(error){
    err_msg = err_msg || "without error message";
    res.json({status: false, clave: false, message: err_msg});
  }else
    res.json({status: true , clave: clave, message: "upload file successfully"});
  
});


app.use(express.static(path.join(__dirname, '../public')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END gae_storage_app]
app.get('/perro/', async (req, res) => {

  console.log(clientinfo)
  res.json(clientinfo);
});


module.exports = app;
