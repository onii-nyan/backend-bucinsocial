const {db,admin} = require('../ulti/admin')
const firebaseConfig = require('../ulti/config')
const {uuid} =require("uuidv4")
const firebase = require('firebase')
firebase.initializeApp(firebaseConfig)

const { SignUpValid, LoginValid, reduceUserProfile} = require('../ulti/valid')

exports.signup = (req,res)=>{    
    const newUser ={
        email: req.body.email,
        password: req.body.password,
        handle: req.body.handle
    }

    const {valid, errors} = SignUpValid(newUser)

    if (!valid) return res.status(400).json(errors)
    
    const noImg = 'def-img.png'

    //validate
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc=>{
        if (doc.exists){
            return res.status(400).json({handle: 'name has been taken'})
        }else {
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
    })
    .then((data)=>{
        userId= data.user.uid
        return data.user.getIdToken()
    })
    .then((idToken)=>{
        token=idToken
        const userCredentials={
            handle:newUser.handle,
            email: newUser.email,
            createAt: new Date().toISOString(),
            imgURL: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
            userId
        }
        return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(()=>{
        return res.status(201).json({token})
    })
    .catch((err)=>{
        console.error(err)
        if (err.code==='auth/email-already-in-use'){
            return res.status(400).json({email:'email has been taken'})
        }else{
            return res.status(500).json({error: err.code})
        }
    })
}

exports.login = (req,res)=>{
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    const {valid, errors} = LoginValid(user)

    if (!valid) return res.status(400).json(errors)
    
    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then((data) =>{
        return data.user.getIdToken()
    })
    .then((token) =>{
        return res.json({token})
    })
    .catch(err =>{
        console.error(err)
        if (err.code === "auth/wrong-password"){
            return res.status(403).json({general: 'User not found'})
        } else return res.status(500).json({error: err.code})
    })
}

// add user profile

exports.addUserProfile = (req,res) =>{
    let userProfile  = reduceUserProfile(req.body)

    db.doc(`/users/${req.user.handle}`).update(userProfile)
        .then(()=>{
            return res.json({message:'profile add'})
        })
        .catch((err)=>{
            return res.status(500).json({error: err.code})
        })
}

exports.uploadImg = (req,res) =>{
    const Busboy = require('busboy')
    const path = require('path')
    const fs = require('fs')
    const os = require('os')

    const busboy = new Busboy({headers: req.headers})

    let imageName
    let imgToBeUp ={}
    let generatedToken=uuid()

    busboy.on('file', (fieldname, file, filename, encoding, mimetype)=>{
        
        if (mimetype !== 'image/png' && mimetype !== 'image/jpeg'){
            return res.status(400).json('wrong type file')
        }
        
        // ex name file = my.image.png 
        const imageExt = filename.split('.')[filename.split('.').length - 1]
        // random name img ex 5464564.png
        imageName = `${Math.round(Math.random()*1000000000)}.${imageExt}`
        const filepath= path.join(os.tmpdir(), imageName)
        imgToBeUp = {filepath,mimetype};
        file.pipe(fs.createWriteStream(filepath))
    })

    //finish upload file
    busboy.on('finish', ()=>{
        admin.storage().bucket(`${firebaseConfig.storageBucket}`).upload(imgToBeUp.filepath,{
            resumable:false,
            metadata:{
                metadata:{
                    contentType: imgToBeUp.mimetype,
                    // //Generate token to be appended to imageUrl
                    firebaseStorageDownloadTokens: generatedToken,
                }
            }
        })
        // img url bs d buka oleh user
        .then(()=>{
            const imgURL =`https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageName}?alt=media&token=${generatedToken}`
            return db.doc(`/users/${req.user.handle}`).update({imgURL})
        })
        .then(()=>{
            return res.json({message: 'img  uploaded'})
        })
        .catch((err)=>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
    })
    // propert every request object
    busboy.end(req.rawBody)
}

// get own user details, likes, bio etc
exports.getAuthUser =(req,res)=>{
    let userData={}
    db.doc(`/users/${req.user.handle}`).get()
    .then(doc=>{
        if(doc.exists){
        userData.credentials=doc.data()
        return db.collection('likes').where('userName', '==', req.user.handle).get()
        }
    })
    .then(data=>{
        userData.likes=[]
        data.forEach(doc => {
            userData.likes.push(doc.data())
        });
        return db.collection('notifications').where('recipient','==', req.user.handle)
        .orderBy('createAt','desc').limit(10).get()
    })
    .then((data)=>{
        userData.notifications=[]
        data.forEach((doc)=>{
            userData.notifications.push({
                recipient: doc.data().recipient,
                sender: doc.data().sender,
                createAt: doc.data().createAt,
                loveId: doc.data().loveId,
                type: doc.data().type,
                read: doc.data().read,
                notificationId: doc.id
            })
        })
        return res.json(userData)
    })
    .catch((err)=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}

// get any user details
exports.getUserDetails=(req,res)=>{
    let userData={}
    db.doc(`/users/${req.params.handle}`).get()
    .then((doc)=>{
        if (doc.exists){
            userData.user=doc.data()
            return db.collection('loves').where('userName', '==', req.params.handle)
            .orderBy('createAt', 'desc').get()
        }else{
            return res.status(400).json({error: 'user not found'})
        }
    })
    .then((data)=>{
        userData.loves=[]
        data.forEach(doc=>{
            userData.loves.push({
                body:doc.data().body,
                createAt:doc.data().createAt,
                userName:doc.data().userName,
                likeCount:doc.data().likeCount,
                commentCount:doc.data().commentCount,
                userImg:doc.data().userImg,
                loveId: doc.id
            })
        })
        return res.json(userData)
    })
    .catch((err)=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}

// mark read notifications
exports.readNotifications =(req,res)=>{
    let batch = db.batch()
    req.body.forEach(notificationId =>{
        const notification = db.doc(`/notifications/${notificationId}`)
        batch.update(notification, {read : true})
    })
    batch.commit()
    .then(()=>{
        return res.json({message: 'notification readed'})
    })
    .catch((err)=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}