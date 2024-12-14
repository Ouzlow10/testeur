// file: src/app.js 

const express = require('express');
require("dotenv").config();
const firebase = require("firebase/app");
const cookieParser = require('cookie-parser');
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const app = express();
const http = require('http');
const bcrypt = require("bcryptjs");
app.use(express.json());
app.use(cookieParser());
const cors=require('cors');
app.use(cors({origin:true}));
const firebaseConfig = {
    apiKey: "AIzaSyBTTpAKsSjammAmwXTzzNp_-Nh0BZ6cbj4",
    authDomain: "appli-reservation-service.firebaseapp.com",
    databaseURL: "https://appli-reservation-service-default-rtdb.firebaseio.com",
    projectId: "appli-reservation-service",
    storageBucket: "appli-reservation-service.firebasestorage.app",
    messagingSenderId: "226926139971",
    appId: "1:226926139971:web:67b77268c3446b6359d2f6"
  };

  firebase.initializeApp(firebaseConfig);
  const admin = require('firebase-admin');
 // const serviceAccount = require("/home/linux/Bureau/Stage_2SI/Mon_api_firebase/FirebaseService.json");
  const serviceAccount=require('/home/ousmane-ndao/Downloads/reservationservice_apirest_nodejs-main/FirebaseService.json');  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const maDate = new Date();
  var t = new Date(1970, 0, 1); // Epoch
  /* t.setSeconds(1732975800);
  console.log(`Voici la date de t ${t}`) */
  const { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendEmailVerification, 
    sendPasswordResetEmail
  
  } = require("firebase/auth") ;

var salt = bcrypt.genSaltSync(10);
const auth = getAuth();
const db = admin.firestore();
/*const realtimedb=admin.database();
const messaging = admin.messaging();*/
var statutdefault;
const { QuerySnapshot } = require('firebase-admin/firestore');
//Secure With https by self-signed certificates
const https = require('https');
const fs = require('fs');
const httpServer = http.createServer(app);
const options = {
  key: fs.readFileSync('/home/ousmane-ndao/Downloads/reservationservice_apirest_nodejs-main/server.key'),
  cert: fs.readFileSync('/home/ousmane-ndao/Downloads/reservationservice_apirest_nodejs-main/server.crt')
};

const httpsServer=https.createServer(options, app);


//Create middleware to check what kind of statut try to souscribe
async function registerChecking(req, res,next) {
    const { email, password,adresse,nom,prenom,statut,telephone} = req.body;
    const userIn=[];

    if (!email || !password) {
        res.status(401).json({
        email: "Email is required",
        password: "Password is required",
    });
    }
    if (!statut) {
        statutdefault="client";
        userIn.push({
            nom:nom,
            prenom:prenom,
            adresse:adresse,
            email:email,
            password:password,
            telephone:telephone,
            statut:statutdefault
        });
        res.locals=userIn[0];
        next();
    } else if (req.body.statut=="admin") {
        const OTPcode=db.collection('OTPcode');
        await OTPcode.get().then(async querySnapshot=>{
            let docs=querySnapshot.docs;
            let s=0;
            for (let doc of docs){
                if (doc.id ==req.query.otpcode) {
                    s+=1;
                } 
            }
            if (s==0) {
                res.status(200).json({message:"You need a OTPcode valide to souscribe as admin"});
            } else {
                   statutdefault="admin"

                    userIn.push({
                        nom:nom,
                        prenom:prenom,
                        adresse:adresse,
                        email:email,
                        password:password,
                        statut:statutdefault,
                        telephone:telephone,
                        codeOPT:req.query.otpcode
                    });
                    res.locals=userIn[0];
                    next();
    
            }
        });
    
    }
 
}


async function deleteUser(req,res) {
    dataUser=res.locals;
    var myIndex;
    const email=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email;
    console.log(JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email)
    //res.status(200).json(`${JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email}`)
    admin.auth().getUserByEmail(email)
  .then(async (user) => {
    const query=db.collection('users');
    await query.get().then(async querySnapshot=>{
        let docs=querySnapshot.docs;
        for (const doc of docs) {
            if (doc.data().email==email) {
                myIndex=doc.id;
            }
            
        }
    });
    await db.collection('users').doc(`${myIndex}`).delete();
    console.log(`User ${email} Account Deleted Successful`);
    res.status(200).json("User Account Deleted Successfully");
    return admin.auth().deleteUser(user.uid);

  });
 

}
    
async function registerUser(req, res) {
    dataUser=res.locals;
    const email=JSON.parse(JSON.stringify(dataUser)).email;
    const password=JSON.parse(JSON.stringify(dataUser)).password;
    const nom=JSON.parse(JSON.stringify(dataUser)).nom;
    const prenom=JSON.parse(JSON.stringify(dataUser)).prenom;
    const adresse=JSON.parse(JSON.stringify(dataUser)).adresse;
    const statut=JSON.parse(JSON.stringify(dataUser)).statut;
    const telephone=JSON.parse(JSON.stringify(dataUser)).telephone;
    const codeOPT=JSON.parse(JSON.stringify(dataUser)).codeOPT;
  
    const ourId=[];
    var myIndex=0;
    const query=db.collection('users');

    await query.get().then(async querySnapshot=>{
        let docs=querySnapshot.docs;
        for (const doc of docs) {
            ourId.push(doc.id);
        }
        var i=0;
            while (i<ourId.length) {
                if (ourId.includes(`${myIndex}`)) {
                    myIndex+=1;
                    i+=1;
                } else {
                    //console.log(`Not ${myIndex} in ${ourId}`);
                    break;


                }

            }
        
        });
    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        sendEmailVerification(auth.currentUser)
        .then(async () => {
            await db.collection('users').doc(`${myIndex}`).create({
                nom: nom,
                prenom:prenom,
                email:email,
                statut:statut,
                adresse:adresse,
                telephone:telephone,
                dateInscrip:Date.now()
        });
        const OTPcode=db.collection('OTPcode');
            await OTPcode.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                let s=0;
                for (let doc of docs){
                    if (doc.id==codeOPT) {
                        await db.collection('OTPcode').doc(`${codeOPT}`).delete();
                    }
                }
            })
        res.status(200).json({ message: "Verification email sent! User created successfully!" });

        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ error: "Error sending email verification" });
        });
    })
    .catch((error) => {
        const errorMessage = error.message || "An error occurred while registering user";
        res.status(500).json({ error: errorMessage });
    });
}

//Login User Request
async function login(req, res) {
    const userIn=[];
    const authheader = req.headers.authorization;
    if (!authheader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.status(401).json({message:"Please enter your valides credentials"});
    }
   else{
        const authT = new Buffer.from(authheader.split(' ')[1],
            'base64').toString().split(':');
        const email = authT[0];
        const password=authT[1];
        signInWithEmailAndPassword(auth, email,password)
        .then(async (userCredential) => { 
            const idToken = userCredential._tokenResponse.idToken
            if (idToken) {
                res.cookie('access_token', idToken, {
                    httpOnly: true
                });
                 const query= db.collection('users');            
                 await query.get().then(async querySnapshot=>{
                     let docs=querySnapshot.docs;
                     for (let doc of docs){
                         if (doc.data().email==email) {
                              userIn.push({
                                 data:doc.data()
                             });
                            res.status(200).json({
                                dataUser:userIn,
                                access_token:idToken
                            });
                         } 
                     }
                     })
               
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        })
        .catch((error) => {
            console.error(error);
            const errorMessage = error.message || "An error occurred while logging in";
            res.status(500).json({ error: errorMessage });
        });
    }
   
}
//Create middleware function from loginUser function.
//This middleware allow to customers to authentificated 
async function authentification(req, res,next) {
    const userIn=[];
    const authheader = req.headers.authorization;
    if (!authheader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.status(401).json({message:"You are not authenticated!"});
    }
   else{
        const authT = new Buffer.from(authheader.split(' ')[1],
            'base64').toString().split(':');
        const email = authT[0];
        const password=authT[1];
        signInWithEmailAndPassword(auth, email,password)
        .then(async (userCredential) => { 
            const query= db.collection('users');            
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs){
                    if (doc.data().email==email) {
                         userIn.push({
                            data:doc.data()
                        });
                        console.log(`Authenfication for user ${userIn[0]['data'].email} at ${maDate.toUTCString()}`);
                        res.locals.datauser=userIn[0];
                        next();

                    } 
                }
                });
        })
        .catch((error) => {
            console.error(error);
            const errorMessage = error.message || "An error occurred while logging in";
            res.status(500).json({ error: errorMessage });
        });
    }
   
}
//middleware to allow admin or Superadmin statut

async function authentification_admin (req, res,next) {
    const userIn=[];
    const authheader = req.headers.authorization;
    var somme_client=0;
    try {
         //console.log(req.headers);
    if (!authheader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.status(401).json('You are not authenticated!');
    }
   else{
        const authT = new Buffer.from(authheader.split(' ')[1],
            'base64').toString().split(':');
        const email = authT[0];
        const password=authT[1];
        signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => { 
            const query= db.collection('users');            
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs){
                    if (doc.data().email==email && (doc.data().statut=="Superadmin" ||doc.data().statut=="admin")) {
                         userIn.push({
                            data:doc.data()
        
                        });
                        somme_client+=1;
                        res.locals.datauser=userIn[0];
                    } 
                }
                if (somme_client==0) {
                    res.status(500).json({message:"You not enable for this action"});
                } else {
                    console.log("Admin Authenfication : ",email, "at ",maDate.toUTCString());

                        next();
                }
                });
        }).catch((error) => {
            console.error(error);
            const errorMessage = error.message || "An error occurred while logging in";
            res.status(500).json({ error: errorMessage });
        });
    } 
   
    
    }
    catch (error) {
        console.error(error);
        const errorMessage = error.message || "An error occurred while logging in";
        res.status(500).json({ error: errorMessage });
    }

    
}
async function authentification_superadmin (req, res,next) {
    const userIn=[];
    const authheader = req.headers.authorization;
    ///const salt = await bcrypt.genSalt(10);
    var somme_client=0;
    //console.log(req.headers);
    if (!authheader) {
        let err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        res.status(401).json(err);
    }
   else{
        const authT = new Buffer.from(authheader.split(' ')[1],
            'base64').toString().split(':');
        const email = authT[0];
        const password=authT[1];
        signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => { 
            const query= db.collection('users');            
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs){
                    if (doc.data().email==email && doc.data().statut=="Superadmin" ) {
                         userIn.push({
                      
                            data:doc.data()
                        });
                        somme_client+=1;
                        res.locals.datauser=userIn[0];

                    } 
                }
                if (somme_client==0) {
                    res.status(500).json({message:"You not enable for this action"});
                } else {
                    console.log("Super admin Authenfication : ",email, "at ",maDate.toUTCString());

                    next();
                }
                });
        })
        .catch((error) => {
            console.error(error);
            const errorMessage = error.message || "An error occurred while logging in";
            res.status(500).json({ error: errorMessage });
        });
    }

    
}

function logoutUser(req, res) {
signOut(auth)
    .then(() => {
    res.clearCookie('access_token');
    res.status(200).json({ message: "User logged out successfully" });
    })
    .catch((error) => {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
    });
}
function resetPassword(req, res){
    const  email = req.body.email;
    if (!email ) {
        res.status(401).json({
        email: "Email is required"
        });
    }
    sendPasswordResetEmail(auth, email)
        .then(() => {
        res.status(200).json({ message: "Password reset email sent successfully!" });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
            }
        );
}

//Get all users 
function getAllusers(req, res) {
    (async ()=>{
        try {
            dataUser=res.locals;
            var i=0;
            const emailAut=JSON.parse(JSON.stringify(dataUser)).email //['datauser'].id
            console.log("Users List get by ",emailAut);
            const query= db.collection('users');
            let response=[];
            await query.get().then(querySnapshot=>{
                let docs=querySnapshot.docs;
    
                for (let doc of docs) {
                    const selectItem={
                        data:doc.data()

                    };
                    if (req.query.limit){
                        if(i<req.query.limit) {
                          response.push(selectItem);
                          i+=1;
                        }
                      }
                      else{
                          response.push(selectItem);
                      }
                    //response.push(selectItem);           
                }
                return response;
        });
        res.status(200).json(response);
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}


//Create a OTP code for adding a admin user
function genOPTCustomer() {
    //create a base-36 string that contains 30 chars in a-z,0-9
    return [...Array(6)]
    .map((e) => (Math.floor(Math.random() * 10)))
    .join('');

}
async function createOPTreservation(req,res){ 
    (async()=>{
        try {
            
            let mycode=genOPTCustomer();
            await db.collection('OTPcodeReservation').doc(`${mycode}`).create({
            }
            );
            res.status(200).json({
                message:"code created and added Successfully",
                code:mycode
                });
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}

async function createOPT(req,res){ 
    (async()=>{
        try {
            const codeTempo=[];
             for (let index = 0; index < parseInt(req.query.nombre); index++) {
                
            
                let mycode=genOPTCustomer();
                await db.collection('OTPcode').doc(`${mycode}`).create({
                }
                );
                codeTempo.push(mycode);
                
                            
            }
            res.status(200).json({
                message:"code created and added ",
                code:codeTempo
                });
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}

//Create and add service by admin or superadmin

async function createService(req,res){
    (async()=>{
        try {
            const query=db.collection('services');
            const ourId=[];
            var myIndex=0,picture,tempsMini;
        
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (const doc of docs) {
                    ourId.push(doc.id); 
                }
                var i=0;
                while (i<ourId.length) {
                    if (ourId.includes(`${myIndex}`)) {
                        myIndex+=1;
                        i+=1;
                    } else {
                        break;
                    }

                }
               
                });
            
            if (req.body.picture) {
                picture=req.body.picture;
            } else {
                picture="";
            }
            if (req.body.tempsMini) {
                tempsMini=req.body.tempsMini;
            } else {
                tempsMini=14400;
            }
            await db.collection('services').doc(`${myIndex}`).create({
                id:myIndex,
                nom: req.body.nom,
                prix: req.body.prix,
                tempsMini:tempsMini,
                picture:picture,
                dateInscri:Date.now()
                
            
           //
            });
            dataUser=res.locals;

            const email=JSON.parse(JSON.stringify(dataUser))['datauser'].email;
            console.log("Service name",req.body.nom, "added by",email);
              res.status(200).json({
                  message:"Service added "

            });
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();

}

//Get all Services 
async function getAllService (req, res) {
    (async ()=>{
        try {
            const query= db.collection('services');
            let response=[];
            var i=0;
            await query.get().then(querySnapshot=>{
                let docs=querySnapshot.docs;
    
                for (let doc of docs) {
                    const selectItem={
                        data:doc.data()
                    };
                    if (req.query.limit){
                        if(i<req.query.limit) {
                          response.push(selectItem);
                          i+=1;
                        }
                    }
                    else{
                          response.push(selectItem);
                    }
                }
                return response;
        })
        res.status(200).json(response);
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}

/* async function getAuser(req,res){
    (async()=>{
        try {
            const query= db.collection('users');
            var if_exist=0;
            var response;
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (const doc of docs) {
                    if (doc.data().email==req.params.email) {
                        if_exist=1;
                        const documentdata=db.collection('users').doc(`${doc.id}`);
                        let user= await documentdata.get();
                        response=user.data();                        
                    }
                    
                }
                if (if_exist==0) {
                    
                    res.status(500).json({message:"Users not found !!"});
                } else {
                    res.status(200).json(response);

                }
               
        })

       
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();


} */
//Search Service
async function searchService (req, res) {
    (async ()=>{
        try {
            var terms=req.query.terms;
            const query= db.collection('services');
            let response=[];
            var i=0;
            await query.get().then(querySnapshot=>{
                let docs=querySnapshot.docs;
    
                for (let doc of docs) {
                    for(var key in doc.data()){
                        if ((doc.data()[key]).toString().toLowerCase().
                        normalize('NFD').replace(/\p{Diacritic}/gu, '')==terms.toLowerCase().
                        normalize('NFD').replace(/\p{Diacritic}/gu, '')) {
                          
                            var selectItem={
                                data:doc.data()
                            };
                            response.push(selectItem);

                        }

                    }

                }
                return response;
        })
        if (response.length==0) {
            res.status(500).json("No service found");

        } else {
            res.status(200).json(response);

        }        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}

//Search User
async function searchUser (req, res) {
    (async ()=>{
        try {
            var terms=req.query.terms;
            const query= db.collection('users');
            let response=[];
            var i=0;
            await query.get().then(querySnapshot=>{
                let docs=querySnapshot.docs;
    
                for (let doc of docs) {
                    for(var key in doc.data()){
                        if ((doc.data()[key]).toString().toLowerCase().
                        normalize('NFD').replace(/\p{Diacritic}/gu, '')==terms.toLowerCase().
                        normalize('NFD').replace(/\p{Diacritic}/gu, '')) {
                          
                            var selectItem={
                                data:doc.data()
                            };
                            response.push(selectItem);

                        }

                    }
                }
                return response;
        })
        if (response.length==0) {
            res.status(500).json("No user found");

        } else {
            res.status(200).json(response);

        }
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}
//Get a specific service 
async function getAservice(req,res){
    (async()=>{
        try {
            const query= db.collection('services');
            var if_exist=0;
            
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (const doc of docs) {
                    if (doc.data().id==req.params.id_service) {
                        if_exist=1;
            
                    }
                    
                }
                if (if_exist==1) {
                    const documentdata=db.collection('services').doc(`${req.params.id_service}`);
                    let services= await documentdata.get();
                    let response=services.data();
                    res.status(200).json(response);
                }
                else{
                    res.status(500).json({message:"services not found !!"})
                    
                }
               
            });

       
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}

//Update a service by admin or Superadmin
async function updateService(req,res){
    (async()=>{
        try {
            const query= db.collection('services');
            var nom;
            var prix;
            var dateInscri,tempsMini,picture;
            var somme_client=0;
            var id;
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs){
                    if (doc.data().id==req.params.id_service) {
                        somme_client=1;
                        id=doc.id;
                        dateInscri=doc.data().dateInscri;
                          if (req.body.picture) {
                            picture=req.body.picture;
                        } else {
                            if (doc.data().picture) {
                                picture=doc.data().picture;
                            } else {
                                picture="";
                            }
                        }
                        if (req.body.tempsMini) {
                            tempsMini=req.body.tempsMini;
                        } else {
                            if (doc.data().tempsMini) {
                                tempsMini=doc.data().tempsMini;
                            } else {
                                tempsMini=14400;
                            }
                        }
                        if (!req.body.nom) {
                            nom=doc.data().nom
                        } else {
                            nom=req.body.nom
                        }
                        if (!req.body.prix) {
                            prix=doc.data().prix;
                        } else {
                            prix=req.body.prix;
                        }
                    }
                }
                if (somme_client==0) {
                    res.status(500).json({message:"service not found !!"});
                } else {
                    const maDate = new Date();
                    
                    await db.collection('services').doc(`${id}`).update({
                        id:id,
                        nom: nom,
                        prix: prix,
                        picture:picture,
                        tempsMini:tempsMini,
                        dateInscri:dateInscri
                   });
                dataUser=res.locals;
                const email=JSON.parse(JSON.stringify(dataUser))['datauser'].email;
                console.log("Service name",nom, "updated by ",email ,"at ",maDate.toUTCString());
                res.status(200).json({message:"service Update Successfully!!"});

                }
                
                

               
                
        })

       
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}
//Delete a service
async function deleteService(req,res){
    (async()=>{
        try {
            const query= db.collection('services');
            var somme_client=0;
            var id_service,id;
            const Ourprofes=[];
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs){

                    if (doc.data().id==req.params.id_service) {
                        somme_client=1;
                        id_service=doc.data().id_service;
                        id=doc.id;
                    }
                }
                if (somme_client==0) {
                    res.status(500).json({message:"service not found !!"});
                } else {
                    
                    await db.collection('services').doc(`${id}`).delete();
                    dataUser=res.locals;
                   
               
                    const email=JSON.parse(JSON.stringify(dataUser))['datauser'].email;
                    console.log("Service id",id, "deleted by ",email ," at ",maDate.toUTCString());
                    res.status(200).json({message:"service delete Successfully!!"});

                }
                
                

               
                
        })

       
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}
async function addProfes(req,res){
    (async()=>{
        try {
            var ifService=0;
            const email=req.body.email;
            const password="pasword@123";
            if (!email) {
                res.status(401).json({
                    email: "Email is required"
                });
            }
            const ourId=[];
            var myIndex=0;
            const query=db.collection('users');

            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (const doc of docs) {
                    ourId.push(doc.id);

                    
                }
                var i=0;
                    while (i<ourId.length) {
                        if (ourId.includes(`${myIndex}`)) {
                            myIndex+=1;
                            i+=1;
                        } else {
                            break;


                        }

                    }
                
                });

            const queryService=db.collection('services');
            await queryService.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (const doc of docs) {
                    if (doc.data().id==req.body.profession) {
                       ifService=1;
                    }
                }
            });
            
            if (ifService==1) {
                
                createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    sendEmailVerification(auth.currentUser)
                    .then(async () => {
                        await db.collection('users').doc(`${myIndex}`).create({
    
                        nom: req.body.nom,
                        email:req.body.email,
                        prenom:req.body.prenom,
                        adresse:req.body.adresse,
                        profession:req.body.profession,
                        telephone:req.boby.telephone,
                        note:0,
                        nombreEff:0,
                        statut:"Technicien",
                        dateInscrip:Date.now()
                    
                
            
                    });
                    const dataUser=res.locals;
                    const email=JSON.parse(JSON.stringify(dataUser))['datauser'].email;
                    console.log("Technician'email",req.body.email, "added by admin'email",email ,"à ",maDate.toUTCString());
                    res.status(200).json({ message: "Verification email sent! User created successfully!" });
                    })
                    .catch((error) => {
                        console.error(error);
                        res.status(500).json({ error: "Error sending email verification" });
                    });
                }) .catch((error) => {
                    const errorMessage = error.message || "An error occurred while registering user";
                    res.status(500).json({ error: errorMessage });
                });
            } else {
                res.status(401).json("Service not available !!");
            }
            
                
               
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}

   //update a worker by a admin/superadmin statut
async function updateProfes(req,res){
    (async()=>{
        //const salt = await bcrypt.genSalt(10);

        email_tech=req.params.email_tech;
        var if_exist=0;
        var isProfession=0;
        var nom_tech,telephone;
        var prenom_tech;
        var profession_tech;
        var idTec,adresse,note,nombreEff,statut,dateInscrip;
        try {
            const query=db.collection('users');
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs) {
                    if (doc.data().email==email_tech) {
                        if (doc.data().statut=="Technicien") {
                            if_exist=1;
                            idTec=doc.id;
                            adresse=req.body.adresse ?req.body.adresse: doc.data().adresse;
                            telephone=req.body.telephone ? req.body.telephone : doc.data().telephone;
                            statut=doc.data().statut;
                            dateInscrip=doc.data().dateInscrip;
                            note=doc.data().note;
                            nom_tech=req.body.nom ? req.body.nom : doc.data().nom;
                            prenom_tech=req.body.prenom ? req.body.prenom : doc.data().prenom;
                            nombreEff=doc.data().nombreEff;
                            telephone=req.body.telephone ? req.body.telephone :doc.data().telephone;
                           // profession_tech=req.body.profession ? req.body.profession : doc.data().profession;
                           /*  if (!req.body.nom) {
                                nom_tech=doc.data().nom;
                            } else {
                                nom_tech=req.body.nom
                            } 
                            if (!req.body.prenom) {
                                prenom_tech=doc.data().prenom;
                            } else {
                                prenom_tech=req.body.prenom
                            }*/
                            if (!req.body.profession) {
                                profession_tech=doc.data().profession;
                            } else {
                                const querySer=db.collection('services');
                                await querySer.get().then(async querySnapshot=>{
                                    let docs=querySnapshot.docs;
                                    for (let doc of docs) {
                                        if (doc.data().nom==req.body.profession) {
                                            isProfession=1;
                                            profession_tech=req.body.profession;
                                        }
                                    }
                                    if (isProfession==0) {
                                         res.status(500).json({
                                            message:`service ${req.body.profession} not exists !!`
                                        })
                                    } 
                                  
                                });
                            }
                        } 
                    } 
                }
                if (if_exist==0) {
                    
                    res.status(500).json("No profile you can update found ");
                    
                }
                else{
                    
                    
                        await db.collection('users').doc(`${idTec}`).update({
        
                        nom: nom_tech,
                        prenom:prenom_tech,
                        email:email_tech,
                        profession:profession_tech,
                        note:note,
                        nombreEff:nombreEff, 
                        statut:statut,   
                        telephone:telephone,
                        dateInscrip:dateInscrip,
                        adresse:adresse,
                    
                    //
                        });
                        const dataUser=res.locals;
                        const email=JSON.parse(JSON.stringify(dataUser))['datauser'].email;
                        console.log("Technician'email",email_tech, "updated by admin'email",email ,"at",maDate.toUTCString());
                        res.status(200).json({
                            message:"User Updated Successfully"
                        });  
                    
                }

                });
        } catch (error) {
            console.log(error);
           res.status(500).json(error);
        }
    })();
}

//delete a professional by admin
   async function deleteProfes(req,res){
    (async()=>{
        //const salt = await bcrypt.genSalt(10);

        const email_tech=req.body.email_tech;
        if (!email_tech) {
            res.status(401).json('Email required');
        }
        var if_exist=0;
        var idTec;
        try {
            const query=db.collection('users');
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs) {
                    if (doc.data().email==email_tech) {
                        if (doc.data().statut=="Technicien") {
                            if_exist=1;
                            idTec=doc.id;
                        }
                    }
                   
                }
                if (if_exist==1) {
                    admin.auth().getUserByEmail(email_tech)
                    .then(async (user) => {
                      await db.collection('users').doc(`${idTec}`).delete();
                      const dataUser=res.locals;
                      const email=JSON.parse(JSON.stringify(dataUser))['datauser'].email;
                      console.log("Technician'email",email_tech, "deleled by admin'email",email ,"at",maDate.toUTCString());
                      res.status(200).json({
                        message:"User deleted Successfully"
                    });  
                      return admin.auth().deleteUser(user.uid);
                    });
                    
                    
                }
                else{
                    res.status(500).json("Technician Profile  not found")
                }

                });
        } catch (error) {
            console.log(error);
           res.status(500).json(error);
        }
    })();
}

//List All Workers with a given nom servace available for a given dateTime
async function  allProfService (req,res){
    (async()=>{
        try {
            var available;
            dataUser=res.locals;
            var i=0,nom_Service,tempsMini;
            const id_service=req.params.id_service;
            //checking the service name First
            const serviceQuery= db.collection('services');
            await serviceQuery.get().then(async querySnapshot=>{
                let service_docs=querySnapshot.docs;
                for (let doc_ser of service_docs){
                    if (doc_ser.data().id==id_service) {
                        nom_Service=doc_ser.data().nom;
                        tempsMini=doc_ser.data().tempsMini;
                    }
                }
            });
            
            const OurWokers=[];
            const userQuery= db.collection('users');
            await userQuery.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                var if_avai=true;
                for (let doc of docs){
                    if ((doc.data().statut=="Technicien")&&(doc.data().profession==id_service)) {
                        if (req.query.dateTravaux) {
                            const reservationCheck=db.collection('Reservation');
                            await reservationCheck.get().then(async querySnapshot=>{
                                let techs=querySnapshot.docs;
                                for (let tec of techs){
                                    if (tec.data().email_tech==doc.data().email &&
                                    Math.abs(tec.data().dateTravaux-req.query.dateTravaux) <tempsMini) {
                                       // var f=t.setSeconds(req.query.dateTravaux);
                                        //var d=t.setSeconds(tec.data().dateTravaux); 
                                       // console.log(`Day of date checking ${f} And day of reservation ${d}`)
                                        if_avai=false;
                                       available=[tec.data().dateTravaux-tempsMini,tec.data().dateTravaux+tempsMini];
                                        break;

                                    }
                                     else{
                                     //   console.log(`Absolue for reservation ${tec.id} est ${Math.abs(tec.data().dateTravaux-req.query.dateTravaux)}`)
                                        available=[0];
                                    } 
                                
                                       
                                    
                                    
                                }
                            });
                        
                                //console.log(`Available for ,${doc.data().email}`);

                            if (req.query.limit && req.query.limit <docs.length){
                                if(i<req.query.limit) {
                                    OurWokers.push({
                                        id:doc.id,
                                        nom:doc.data().nom,
                                        email:doc.data().email,
                                        prenom:doc.data().prenom,
                                        profession:doc.data().profession,
                                        nombreEff:doc.data().nombreEff,
                                        adresse:doc.data().adresse,
                                        note:doc.data().note,
                                        telephone:data().telephone,
                                        available:available,
                                    });
                                    i+=1;
                                }
                            }
                            else{
                                OurWokers.push({
                                id:doc.id,
                                nom:doc.data().nom,
                                email:doc.data().email,
                                prenom:doc.data().prenom,
                                profession:doc.data().profession,
                                nombreEff:doc.data().nombreEff,
                                adresse:doc.data().adresse,
                                note:doc.data().note,
                                telephone:doc.data().telephone,
                                available:available,
                                });
                            }
                            
                        }
                        else{
                            if (req.query.limit){
                                if(i<req.query.limit && req.query.limit <docs.length) {
                                    OurWokers.push({
                                        id:doc.id,
                                        nom:doc.data().nom,
                                        email:doc.data().email,
                                        prenom:doc.data().prenom,
                                        profession:doc.data().profession,
                                        nombreEff:doc.data().nombreEff,
                                        adresse:doc.data().adresse,
                                        note:doc.data().note,
                                        telephone:doc.data().telephone,
                                        available:available
                                        });
                                    i+=1;
                                }
                            }
                            else{
                                OurWokers.push({
                                id:doc.id,
                                nom:doc.data().nom,
                                email:doc.data().email,
                                prenom:doc.data().prenom,
                                profession:doc.data().profession,
                                nombreEff:doc.data().nombreEff,
                                adresse:doc.data().adresse,
                                note:doc.data().note,
                                telephone:doc.data().telephone,
                                available:available
                                });
                            }
                            
                            
                        }
                        
                    }
                }
                
               
            });
            if (OurWokers.length==0) {
                res.status(200).json({message:`No Technician found for ${nom_Service}`});

            } else {
                res.status(200).json({message:`Available Technicians list of service ${nom_Service}`,
                    technicien:OurWokers.sort((a, b) => (a.note < b.note ? 1 : -1 && a.available > b.available ? 1 : -1))
                });

            }

       
        } catch (error) {
            console.log(error);
            return res.status(500).json(error);
        }
    })();
}

async function addReservation(req,res){
    (async()=>{

        try {
            const ourId=[];
            var myIndex=0,telephone_tech,prenom_tech,nom_tech,nom_service;
            
            const service=db.collection("services");
            await service.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
          
                for (let doc of docs){
                    if (doc.data().id==req.body.id_service) {                
                        
                        nom_service=doc.data().nom;

                    }
                }});
            const Technicians=db.collection("users");
            await Technicians.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
            
                for (let doc of docs){
                    if (doc.data().email==req.body.email_tech) {                
                        email_tech=doc.data().email;
                        telephone_tech=doc.data().telephone;
                        prenom_tech=doc.data().prenom;
                        nom_tech=doc.data().nom;

                    }
                }
             })
            const reservationTec=db.collection("Reservation");
            await reservationTec.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
        
                //Check index avaible in Reservation Table
                for (const doc of docs) {
                    ourId.push(doc.id); 
                }
                var i=0;
                while (i<ourId.length) {
                    if (ourId.includes(`${myIndex}`)) {
                        myIndex+=1;
                        i+=1;
                    } else {
                        break;
                    }

                }
                const maDate = new Date();

                  
                    
            const OTPcode=db.collection("OTPcodeReservation");
            await OTPcode.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                let ifcodeValide=false;
                for (let doc of docs){
                    if (doc.id ==req.query.otpcode) {//
                        ifcodeValide=true;
                    } 
                }
                if (ifcodeValide==false) {
                    res.status(200).json({message:"You need a OTPcode valide to add a reservation"})
                } else {

                        const dataUser=res.locals;
                        await db.collection('Reservation').doc(`${myIndex}`).create({
                        email_client:JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email,
                        telephone_client:JSON.parse(JSON.stringify(dataUser))['datauser']['data'].telephone,
                        adresse_client:req.body.adresse ? req.body.adresse:JSON.parse(JSON.stringify(dataUser))['datauser']['data'].adresse,
                        prenom_client:JSON.parse(JSON.stringify(dataUser))['datauser']['data'].prenom,
                        nom_client:JSON.parse(JSON.stringify(dataUser))['datauser']['data'].nom,
                        nom_service:nom_service,
                        email_tech:req.body.email_tech,
                        telephone_tech:telephone_tech,
                        prenom_tech:prenom_tech,
                        nom_tech:nom_tech,
                        date:Date.now(),
                        etat:"En cours",
                        note:0,
                        avis:"",
                        dateTravaux:req.body.dateTravaux,
                        dateEff:0
                    }); 
                    //await db.collection('OTPcodeReservation').doc(`${req.query.otpcode}`).delete();
                    res.status(200).json({message:"Reservation added Successfully !!",
                });

                } 
            })
            
            
        
        
                });
           
        
            
           
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}

//Read all Reservations by a admin user

async function readReservation (req,res){
    (async ()=>{
        try {
            const query= db.collection('Reservation');
            let response=[];
            var i=0;
            await query.get().then(querySnapshot=>{
                let docs=querySnapshot.docs;
    
                for (let doc of docs) {
                    const selectItem={
                        data:doc.data()
                    };
                   if (req.query.limit){
                      if(i<req.query.limit) {
                        response.push(selectItem);
                        i+=1;
                      }
                    }
                    else{
                        response.push(selectItem);
                    }
                }
                return response;
        });
        return res.status(200).json(response.sort((a, b) => (a.dateTravaux < b.dateTravaux ? 1 : -1)));
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}

//Read all Reservations of a  customers by the owner

async function readReservationCustomer (req,res){
    (async ()=>{
        try {
            var i=0;
            const dataUser=res.locals;
            //console.log(dataUser['datauser']['data']);

            const emailUser=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email;
            const query= db.collection('Reservation');
            let response=[];
            await query.get().then(querySnapshot=>{
                let docs=querySnapshot.docs;
                for (const doc of docs) {
                    if (doc.data().email_client==emailUser) {

                        const selectItem={
                           data:doc.data() 
                        };
                        if (req.query.limit){
                            if(i<req.query.limit) {
                              response.push(selectItem);
                              i+=1;
                            }
                        }
                        else{
                              response.push(selectItem);
                        }

                    }        

                }
                
                
                return response;
        })
        if (response.length==0) {
            res.status(500).json("You have no reservation for yet");
        } else {
            res.status(200).json(response.sort((a, b) => (a.dateTravaux < b.dateTravaux ? 1 : -1)));

        }
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}

//Read all Reservations of a technician by the owner

async function readReservationTech (req,res){
    (async ()=>{
        try {
            var i=0;
            const dataUser=res.locals;
            const emailTec=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email;
            const query= db.collection('Reservation');
            let response=[];
            await query.get().then(querySnapshot=>{
                let docs=querySnapshot.docs;
    
                for (let doc of docs) {
                    if (doc.data().email_tech==emailTec) {
                        const selectItem={
                            data:doc.data()
    
                        };
                        if (req.query.limit){
                            if(i<req.query.limit) {
                              response.push(selectItem);
                              i+=1;
                            }
                          }
                          else{
                              response.push(selectItem);
                          }

                    }
                }
                return response;
        })
        if (response.length==0) {
            res.status(500).json("You have no reservation for yet");
        } else {
            res.status(200).json(response.sort((a, b) => (a.dateTravaux < b.dateTravaux ? 1 : -1)));

        }
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}
async function readAReservation(req,res){
    (async()=>{
        try {
            var data;
            const query= db.collection('Reservation');
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                let somme=0;
                for (let doc of docs){
                    if (doc.id ==req.params.id) {
                        somme+=1;
                        data=doc.data();
                    } 
                
                }

                if (somme==0) {
                    res.json({message:"Reservation with this id not found !!"});
                } 
                else{
                    
                    res.status(200).json({message:"Reservation found Successfully!!",
                      Info:data
                    })
                }                
           })

       
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}

//Update a specific reservation based on client

async function updateReservationCustomer (req,res){
    (async()=>{
        try {
            dataUser=res.locals;
            const emailCusto=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email;
            var tempsMini=0;
        
            const query= db.collection('Reservation');
            var nombre_cl=0,date,dateTravaux_update,telephone_client,prenom_client,prenom_tech,adresse_client,
            nom_client,email_tech,telephone_tech,nom_tech,etat,note,avis,nom_service;
            var if_avai=true;
            var available=[];
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs){

                    if (doc.id==req.params.id) {
                        nombre_cl+=1;
                        if (emailCusto==doc.data().email_client) {
                            date=doc.data().date;
                            email_client=doc.data().email_client,
                            telephone_client=doc.data().telephone_client,
                            adresse_client=req.body.adresse ? req.body.adresse:doc.data().adresse_client,
                            prenom_client=doc.data().prenom_tech;
                            nom_client=doc.data().nom_client;
                            nom_service=doc.data().nom_service;
                            email_tech=doc.data().email_tech;
                            telephone_tech=doc.data().telephone_tech;
                            prenom_tech=doc.data().prenom_tech;
                            nom_tech=doc.data().nom_tech;
                            etat=doc.data().etat;
                            note=doc.data().note;
                            avis=doc.data().avis;
                            dateEff="";
                            dateTravaux_update=req.body.dateTravaux?req.body.dateTravaux:doc.data().dateTravaux;
                        //Checking the maximal time for the service name
                        const queyrSer= db.collection('services');
                        await queyrSer.get().then(async querySnapshot=>{
                        let docs_services=querySnapshot.docs;
                        for (let doc_ser of docs_services){
                            if (doc_ser.data().nom==nom_service) {
                                tempsMini=doc_ser.data().tempsMini;
                            }}});
                            if (
                                Math.abs(doc.data().dateTravaux-req.body.dateTravaux) <tempsMini) {
                                   if_avai=false;
                                   available=[doc.data().dateTravaux-tempsMini,doc.data().dateTravaux+tempsMini];
                                    break;
            
                                }
                                 else{
                                      available=[0];
                                } 

                        }
                            
                    } 
                }
               if (if_avai==false) {
                
                res.status(500).json({message:"For all the below interval datetime,your technician will not available",
                    Notavailable:available,
                });
               } else {
                if (nombre_cl==0) {
                    res.status(500).json({message:"Reservation not found !!"});
                } 
                else{
                    await db.collection('Reservation').doc(`${req.params.id}`).update({
                        email_client:email_client,
                        telephone_client:telephone_client,
                        adresse_client:adresse_client,
                        prenom_client:prenom_client,
                        nom_client:nom_client,
                        nom_service:nom_service,
                        email_tech:email_tech,
                        telephone_tech:telephone_tech,
                        prenom_tech:prenom_tech,
                        nom_tech:nom_tech,
                        date:date,
                        etat:etat,
                        note:note,
                        avis:avis,
                        dateTravaux:dateTravaux_update,
                        dateEff:0

                      
                    });
                    res.status(200).json({message:"Reservation update"});
               
                }
               }
                
                

               
                
        })

       
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}
//Update a specific reservation based on client by admin

async function updateReservationAdmin (req,res){
    (async()=>{
        try {
            dataUser=res.locals;
            const emailAdmin=JSON.parse(JSON.stringify(dataUser))['datauser'].email
            var email_Technicien=req.body.email_tech_old ;
            var if_avai=true;
            var available=[];
            const query= db.collection('Reservation');
            var nombre_cl=0,date,dateTravaux,tempsMini,telephone_client,prenom_client,prenom_tech_new,adresse_client,
            nom_client,email_client,email_tech_new=req.body.email_Technicien_new,telephone_tech_new,nom_tech_new,etat,note,avis,nom_service;
                        //Extrading new technician Informations
                        const Users=db.collection('users');
                        await Users.get().then(async querySnapshot=>{
                            let docs=querySnapshot.docs;
                            for (let doc of docs){
                                if(doc.data().email==req.body.email_tech_new){
                                    prenom_tech_new=doc.data().prenom;
                                    nom_tech_new=doc.data().nom;
                                    telephone_tech_new=doc.data().telephone;
                                    email_tech_new=req.body.email_tech_new;
                                }
                            }
            });
                   
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs){
                    if (doc.id==req.params.id) {
                        if (email_Technicien==doc.data().email_tech) {
                            nombre_cl+=1;
                            date=doc.data().date;
                            email_client=doc.data().email_client,
                            telephone_client=doc.data().telephone_client ? doc.data().telephone_client: 770000077,
                            adresse_client=doc.data().adresse_client,
                            prenom_client=doc.data().prenom_client;
                            nom_client=doc.data().nom_client;
                            nom_service=doc.data().nom_service;
                            etat=doc.data().etat;
                            note=doc.data().note;
                            avis=doc.data().avis;
                            dateEff="";
                            dateTravaux=doc.data().dateTravaux;
                             
                        }
                            
                    } 
                    //Checking the maximal time for the service name
                    const queyrSer= db.collection('services');
                    await queyrSer.get().then(async querySnapshot=>{
                    let docs_services=querySnapshot.docs;
                    for (let doc_ser of docs_services){
                        if (doc_ser.data().nom==nom_service) {
                            tempsMini=doc_ser.data().tempsMini;
                        }}});
                        if (doc.data().email_tech==email_tech_new && Math.abs(doc.data().dateTravaux-dateTravaux) <tempsMini) {
                           if_avai=false;
                           available=[doc.data().dateTravaux-tempsMini,doc.data().dateTravaux+tempsMini];
                            break;
    
                        }
                         else{
                              available=[0];
                         } 
                }
                if (if_avai==false) {
                    res.status(500).json({message:"This technician is not available for this date"});
                } else {
                    if (nombre_cl==0) {
                        res.status(500).json({message:"A Reservation for this technician not found !!"});
                    } 
                    else{
                        await db.collection('Reservation').doc(`${req.params.id}`).update({
                            email_client:email_client,
                            telephone_client:telephone_client,
                            adresse_client:adresse_client,
                            prenom_client:prenom_client,
                            nom_client:nom_client,
                            nom_service:nom_service,
                            email_tech:email_tech_new,
                            telephone_tech:telephone_tech_new,
                            prenom_tech:prenom_tech_new,
                            nom_tech:nom_tech_new,
                            date:date,
                            etat:etat,
                            note:note,
                            avis:avis,
                            dateTravaux:dateTravaux,
                            dateEff:0
    
                            
                        });
                        res.status(200).json({message:"Reservation update"});
                    
                    }
                }
                
                

                
                
        })

    
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}

async function finalizerReservation(req,res){
    (async()=>{
        try {
            dataUser=res.locals;
            const emailCusto=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email

            const query= db.collection('Reservation');
            var nombre_cl=0,date,dateTravaux,telephone_client,prenom_client,prenom_tech,adresse_client,
            nom_client,email_tech=req.body.email_Technicien_,telephone_tech,nom_tech,etat,note,avis,nom_service;
         
            var note_tech;
            var nombreEff;
            var email_Technicien;
            var note_Technicien;
            await query.get().then(async querySnapshot=>{  
                let docs=querySnapshot.docs;
                for (let doc of docs){
                    if (doc.id==req.params.id) {
                        if (emailCusto==doc.data().email_client) {
                            nombre_cl+=1;
                            date=doc.data().date;
                            email_client=doc.data().email_client,
                            adresse_client=doc.data().adresse_client;
                            telephone_client=doc.data().telephone_client,
                            prenom_client=doc.data().prenom_tech;
                            nom_client=doc.data().nom_client;
                            nom_service=doc.data().nom_service;
                            email_tech=doc.data().email_tech;
                            telephone_tech=doc.data().telephone_tech;
                            prenom_tech=doc.data().prenom_tech;
                            nom_tech=doc.data().nom_tech;
                           
                            dateEff="";
                            dateTravaux=doc.data().dateTravaux;
                        }
                    } 
                }

                if (nombre_cl==0) {
                    res.status(500).json({message:"Reservation for you not found !!"});
                } 
                else{
                    const maDate = new Date();
                    note=req.body.note ? req.body.note:0;
                    avis=req.body.avis ?req.body.avis:"";
                    note_Technicien=note;
                    await db.collection('Reservation').doc(`${req.params.id}`).update({
                        email_client:emailCusto,
                        telephone_client:telephone_client,
                        adresse_client:adresse_client,
                        prenom_client:prenom_client,
                        nom_client:nom_client,
                        nom_service:nom_service,
                        email_tech:email_tech,
                        telephone_tech:telephone_tech,
                        prenom_tech:prenom_tech,
                        nom_tech:nom_tech,
                        date:date,
                        etat:"Effectué",
                        note:note,
                        avis:avis,
                        dateTravaux:dateTravaux,
                        dateEff:maDate,
                    
                    });
                    console.log("The customer'email",emailCusto,"comfirmed the realization for the reservation by ",email_Technicien);
                    const userQuery= db.collection('users');
                    var total;
                
                    await userQuery.get().then(async querySnapshoTT=>{
                    let docs_tech=querySnapshoTT.docs;
                    
                    for (let doc_tech of docs_tech){
                        if (doc_tech.data().email==email_Technicien) {
                            note_tech=doc_tech.data().note +note_Technicien;
                            if (note==0) {
                                total=doc_tech.data().nombreEff;
                            }
                            else{
                                total=doc_tech.data().nombreEff+1;
                            }
                            nombreEff=doc_tech.data().nombreEff+1;
                            
                            await db.collection('users').doc(`${doc_tech.id}`).update({
                            nom: doc_tech.data().nom,
                            prenom:doc_tech.data().prenom,
                            email:doc_tech.data().email,
                            adresse:doc_tech.data().adresse,
                            profession:doc_tech.data().profession,
                            note:note_tech/total,
                            nombreEff:nombreEff,
                            statut:doc_tech.data().statut,
                            dateInscrip:doc_tech.data().dateInscrip
                            });
                        
                        }
                    }
                    res.status(200).json({message:"Reservation done"});

                    })
                }
                    
                    

                        
            })
                

       
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    })();
}
//CREATE STORING CHOICE USER FUNCTION
async function storingChoice (req,res){
    (async ()=>{
        try {
            var i=0;
            const dataUser=res.locals;
            var service="",technicien="",datecommande="",ifexist=false;
            const emailuser=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email;
            const query=db.collection('choice');
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs) {
                    if (doc.id==emailuser) {
                    
                        ifexist=true;
                        service=doc.data().service;
                        technicien=doc.data().technicien;
                        datecommande=doc.data().datecommande;
                    }
                }
            });
           if (ifexist) {
            await db.collection('choice').doc(`${emailuser}`).update({
                service: req.body.service?req.body.service:service,
                technicien:req.body.technicien?req.body.technicien:technicien,
                datecommande:req.body.datecommande?req.body.datecommande:datecommande
            });
    
           } else {
            await db.collection('choice').doc(`${emailuser}`).create({
                service: req.body.service?req.body.service:service,
                technicien:req.body.technicien?req.body.technicien:technicien,
                datecommande:req.body.datecommande?req.body.datecommande:datecommande
            });
    
           }
            res.status(200).json("save");

        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}

//READ STORING CHOICE USER FUNCTION
async function readChoice (req,res){
    (async ()=>{
        try {
            var i=0;
            const dataUser=res.locals;
            const emailuser=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email;
            const query=db.collection('choice');
            var data=[]
            await query.get().then(async querySnapshot=>{
                let docs=querySnapshot.docs;
                for (let doc of docs) {
                    if (doc.id==emailuser) {
                        data.push(doc.data())
                    }
                   
                }
            });
                res.status(200).json(data);

        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}
//DELETE STORING CHOICE USER FUNCTION
async function deleteChoice (req,res){
    (async ()=>{
        try {
            var i=0;
            const dataUser=res.locals;
            const emailuser=JSON.parse(JSON.stringify(dataUser))['datauser']['data'].email;
            await db.collection('choice').doc(`${emailuser}`).delete({});
            res.status(200).json("delete");

        } catch (error) {
            console.log(error);
            res.status(500).json(error);
            
        }})();
}
app.post('/api/register',registerChecking,registerUser);
app.get('/api/login',login);
app.post('/api/logout', authentification,logoutUser);
app.post('/api/reset-password',resetPassword); //    "password":"Monpassword@123"
app.get('/api/read/users',authentification_admin,getAllusers );
app.get('/api/create/codeotp',authentification_superadmin,createOPT);
app.get('/api/create/codeotpreservation',authentification,createOPTreservation);
app.post("/api/create/service",authentification_admin,createService);
app.get("/api/read/services",getAllService);
app.post("/api/save",authentification,storingChoice);
app.get("/api/save",authentification,readChoice);
app.delete('/api/save',authentification,deleteChoice);
app.get("/api/search/service",searchService);
app.get("/api/search/users",searchUser);
app.get("/api/read/service/:id_service",getAservice);
app.put("/api/update/service/:id_service",authentification_admin,updateService);
app.post("/api/create/technicien",authentification_admin,addProfes);
app.put("/api/update/technicien/byadmin/:email_tech",authentification_admin,updateProfes);
app.get("/api/read/technicien/:id_service",authentification,allProfService);
//app.get('/api/read/technicien/:id_service',authentification,allProfServiceAvailable);
app.post("/api/create/reservation",authentification,addReservation);
app.get('/api/read/reservations',authentification_admin,readReservation);
app.get('/api/read/reservations/customer',authentification,readReservationCustomer);
app.get('/api/read/reservations/technician',authentification,readReservationTech);

app.get("/api/read/reservations/:id",authentification_admin,readAReservation);
app.put("/api/update/reservations/byclient/:id",authentification,updateReservationCustomer);
app.put("/api/update/reservations/:id",authentification_admin,updateReservationAdmin);
//app.get("/api/search/reservations",authentification_admin,researchReservation);
app.put("/api/finalizer/reservations/:id",authentification,finalizerReservation);
app.delete("/api/delete/user",authentification,deleteUser);
app.delete("/api/delete/prof/admin",authentification_admin,deleteProfes);
app.delete("/api/delete/service/:id_service",authentification_admin,deleteService);

/*app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
});*/

/* httpServer.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
});
 */
httpsServer.listen(8000, () => {
    console.log('HTTPS Server running on port 8000');
});