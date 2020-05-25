const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const path = require('path');
const session = require('express-session');   
const multer = require('multer');
const { v4: uuidv4 } = require('uuid'); 
const { remove } = require('fs-extra');

//------------------------------------- Inicialize -------------------------------------//
const app = express();



const admin = require("firebase-admin");
const serviceAccount = require("./googlekey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://proyecto1-61b87.firebaseio.com"
});
const bucket = admin.storage().bucket("gs://proyecto1-61b87.appspot.com");
const firedb = admin.database();

//------------------------------------- Middleware -------------------------------------//

app.use(bodyParser.json());
app.use(session({                                               
  secret: 'secret',                                  
  resave: true,                                       
  saveUninitialized: true                             
}));

/*
app.all('*', function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "X-Requested-With");
   next();
});
*/
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/upload'),
  filename(req, file, cb) {
    //const d = moment().format('x');
    //cb(null, d.toString() + path.extname(file.originalname));
    cb(null, file.originalname);
  }
});
app.use(multer({storage}).array('fieldname[]',[10])); 

//------------------------------------- Call routes -------------------------------------//

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
          const destination = moment().format('DDDD') + '/' + req.sessionID + '/f' + i +  path.extname(files[i]['filename']);
          const options = {
            destination: destination,
            resumable: true,
            public: true,
            //predefinedAcl: 'publicRead',
            validation: 'crc32c'
          };
          try {
            const res2 = await bucket.upload(files[i]['path'], options);
            const publicUrl = 'https://storage.googleapis.com/' + res2[1]['bucket'] + '/' + encodeURIComponent(res2[1]['name'].trim())
            //console.log(publicUrl);
            if(res2){
              try {
                const res3 = remove(path.resolve('./public/upload/' + files[i]['filename']));
                if(res3){
                  filesgroup.push({
                    filenum: i,
                    newname: 'f' + i +  path.extname(files[i]['filename']),
                    oldname: files[i]['filename'], 
                    publicUrl: publicUrl,
                    pages: req.body.fieldpage[i],
                    copys: req.body.fieldqty[i]
                  });
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

const merge = require('easy-pdf-merge');
app.post('/mergepdf/:id', async (req, res) => {

  console.log(req.params.id);
  console.log('--------');
  console.log(req.body);

  if(req.body != null){
    const copy = req.body['copy'];
    let arr_merge = []
    for (let i = 0; i < copy.length; i++) {
      for (let j = 0; j < copy[i]; j++) {
        arr_merge.push(req.body['urls'][i]);
      }
    }
    console.log(arr_merge);
    console.log();
    merge([arr_merge[0],arr_merge[1]],path.join(__dirname, '../public/docs/'+req.params.id+'.pdf'), function(err){
      if(err) {
        return console.log(err)
      }
      console.log('Successfully merged!')
    });
  }
  
  res.json('algo');
});


//------------------------------------- Static files -------------------------------------//

app.use(express.static(path.join(__dirname, '../public')));

//------------------------------------- Start server -------------------------------------//
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});



module.exports = app;
