const {admin, db} = require('./admin')

module.exports = (req,res,next)=>{
    let idToken
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken= req.headers.authorization.split('Bearer ')[1]
    }else{
        console.error('no token found')
        return res.status(403).json({error: 'unauthorized'})
    }
    admin.auth().verifyIdToken(idToken)
    .then(decodedToken=>{
        req.user=decodedToken
        console.log(decodedToken)
        return db.collection('users').where ('userId','==', req.user.uid).limit(1).get()
    })
    .then ((data)=>{
        req.user.handle=data.docs[0].data().handle
        req.user.imgURL = data.docs[0].data().imgURL;
        return next()
    })
    .catch((err)=>{
        console.error('error verify boss',err)
        return res.status(400).json(err)
    })
}