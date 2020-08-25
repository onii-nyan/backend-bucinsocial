const functions = require('firebase-functions');
const app=require('express')()
const fbAuth = require('./ulti/fbAuth')

const {db} = require('./ulti/admin')


const { signup, login, uploadImg, addUserProfile, getAuthUser, getUserDetails, readNotifications } = require('./handle/users');
const { getLove, createLove, getOneLove, loveComment, unlikeLove, likeLove, delLove } = require('./handle/bucin');

// signup
app.post('/signup',signup)

//login
app.post('/login', login)

//get love post
app.get('/loves',getLove)

//create post
app.post('/createlove',fbAuth, createLove)

//upload img
app.post('/user/img',fbAuth, uploadImg)

// add detaiils
app.post('/user', fbAuth, addUserProfile)

// get post details
app.get('/user', fbAuth, getAuthUser)

// get per one post
app.get('/love/:loveId', fbAuth, getOneLove)

// todo like
app.get('/love/:loveId/like', fbAuth, likeLove)

// todo unlike
app.get('/love/:loveId/unlike', fbAuth, unlikeLove)

// todo comment
app.post('/love/:loveId/comment', fbAuth, loveComment )

// todo delete 
app.delete('/love/:loveId', fbAuth, delLove)

// get user details
app.get('/user/:handle', fbAuth, getUserDetails)

// read notifications
app.post('/notifications', fbAuth, readNotifications )

exports.api =functions.region('asia-southeast2').https.onRequest(app)

//create notifications
exports.notificationLikes = functions.region('asia-southeast2').firestore.document('likes/{id}')
    .onCreate((snapshot)=>{
        return db.doc(`/loves/${snapshot.data().loveId}`).get()
        .then((doc)=>{
            if(doc.exists && doc.data().userName !== snapshot.data().userName){
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createAt: new Date().toISOString(),
                    recipient: doc.data().userName,
                    sender: snapshot.data().userName,
                    type: 'like',
                    read: false,
                    loveId: doc.id ,
                    notificationId: snapshot.id       
                })
            }
        })
        .catch(err=>{
            console.error(err)
        })
    })

exports.delNotificationUnlike = functions.region('asia-southeast2').firestore.document('likes/{id}')
    .onDelete((snapshot)=>{
        return db.doc(`/notifications/${snapshot.id}`).delete()
        .catch(err=>{
            console.error(err)
        })
    })

exports.notificationComment = functions.region('asia-southeast2').firestore.document('comments/{id}')
    .onCreate((snapshot)=>{
        return db.doc(`/loves/${snapshot.data().loveId}`).get()
        .then((doc)=>{
            if(doc.exists && doc.data().userName !== snapshot.data().userName){
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createAt: new Date().toISOString(),
                    recipient: doc.data().userName,
                    sender: snapshot.data().userName,
                    type: 'comment',
                    read: false,
                    loveId: doc.id,
                    notificationId: snapshot.id 
                }) 
            } 
        })
        .catch(err=>{
            console.error(err)
            return
        })
    })

// image change

exports.imgChange= functions.region('asia-southeast2').firestore.document('/users/{userId}')
    .onUpdate((change)=>{
        console.log(change.before.data())
        console.log(change.after.data())
        if(change.before.data().imgURL !== change.after.data().imgURL){
            console.log('img change')
            const batch = db.batch()
            return db.collection('loves').where('userName', '==', change.before.data().handle).get()
            .then((data)=>{
                data.forEach((doc)=>{
                    const love = db.doc(`/loves/${doc.id}`)
                    batch.update(love, {userImg: change.after.data().imgURL})
                })
                return batch.commit()
            })
        } else return true
    })

exports.onLoveDel= functions.region('asia-southeast2').firestore.document('/loves/{loveId}')
.onDelete((snapshot, context)=>{
    const loveId = context.params.loveId
    const batch = db.batch()
    return db.collection('comments').where('loveId', '==', loveId).get()
    .then((data)=>{
        data.forEach((doc)=>{
            batch.delete(db.doc(`/comments/${doc.id}`))
        })
        return db.collection('likes').where('loveId', '==', loveId).get()
    })
    .then((data)=>{
        data.forEach((doc)=>{
            batch.delete(db.doc(`/likes/${doc.id}`))
        })
        return db.collection('notifications').where('loveId', '==', loveId).get()
    })
    .then((data)=>{
        data.forEach((doc)=>{
            batch.delete(db.doc(`/notifications/${doc.id}`))
        })
        return batch.commit()
    })
    .catch((err)=>{
        console.error(err)
    })
})