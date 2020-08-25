const{db} =require('../ulti/admin')

exports.getLove = (req,res) => {
    db.collection('loves').orderBy('createAt', 'desc').get()
    .then(data => {
        let loves= [];
        data.forEach(doc =>{
            loves.push({
                loveId:doc.id,
                userName: doc.data().userName,
                coupleName: doc.data().coupleName,
                body: doc.data().body,
                createAt: doc.data().createAt,
                commentCount:doc.data().commentCount,
                likeCount:doc.data().likeCount,
                userImg:doc.data().userImg
            })
        })
        return res.json(loves)
    })
    .catch(err => {
        console.error(err)
        res.status(500).json({error:err.code})
    })
}

exports.createLove =(req,res) => {
    if (req.body.body.trim() === ''){
        return res.status(400).json({body:'body empty'})
    }
    const newLove ={
        userName: req.user.handle,
        body: req.body.body,
        createAt: new Date().toISOString(),
        userImg: req.user.imgURL,
        likeCount:0,
        commentCount:0
    }
    db.collection('loves').add(newLove)
    .then(doc => {
        const resLove = newLove
        resLove.loveId=doc.id
        res.json(resLove)
    })
    .catch(err=>{
        res.status(500).json({error: 'error boss'})
        console.error(err)
    })
}

exports.getOneLove = (req,res) =>{
    let loveData={}
    db.doc(`/loves/${req.params.loveId}`).get()
    .then(doc=>{
        if(!doc.exists){
            return res.status(400).json({error: 'love not found'})
        }
        loveData = doc.data();
        loveData.loveId=doc.id;
        return db.collection('comments').orderBy('createAt', 'desc').where('loveId', '==', req.params.loveId).get()
    })
    .then((data)=>{
        loveData.comments=[];
        console.log(data)
        data.forEach((doc)=>{
            loveData.comments.push(doc.data())
        })
        return res.json(loveData)
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}


//comment  a love
exports.loveComment =(req,res)=>{
    if(req.body.body.trim() === '') 
    return res.status(500).json({error: 'comment must not empty'})

    const newComment={
        body: req.body.body,
        createAt: new Date().toISOString(),
        loveId: req.params.loveId,
        userName: req.user.handle,
        userImg: req.user.imgURL
    }

    db.doc(`/loves/${req.params.loveId}`).get()
    .then(doc=>{
        if(!doc.exists){
            return res.status(404).json({message:'love not found'})
        }
        return doc.ref.update({commentCount: doc.data().commentCount+1})
    })
    .then(()=>{
        return db.collection('comments').add(newComment)
    })
    .then(()=>{
        res.json(newComment)
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}

exports.likeLove=(req,res)=>{
    const likeDoc = db.collection('likes').where('userName', '==', req.user.handle)
    .where('loveId', '==', req.params.loveId).limit(1)

    const loveDoc = db.doc(`/loves/${req.params.loveId}`)

    let loveData

    loveDoc.get()
    .then(doc=>{
        if (doc.exists){
            loveData= doc.data()
            loveData.loveId=doc.id
            return likeDoc.get()
        }else{
            return res.status(404).json({error:'love not found'})
        }
    })
    .then(data=>{
        if (data.empty){
            return db.collection('likes').add({
                loveId: req.params.loveId,
                userName: req.user.handle
            })
            .then(()=>{
                loveData.likeCount++
                return loveDoc.update({likeCount:loveData.likeCount})
            })
            .then(()=>{
                return res.json(loveData)
            })
        } else {
            return res.status(400).json({ message: 'udh di like cuk'})
        }
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}
exports.unlikeLove=(req,res)=>{
    const likeDoc = db.collection('likes').where('userName', '==', req.user.handle)
    .where('loveId', '==', req.params.loveId).limit(1)

    const loveDoc = db.doc(`/loves/${req.params.loveId}`)

    let loveData

    loveDoc.get()
    .then(doc=>{
        if (doc.exists){
            loveData= doc.data()
            loveData.loveId=doc.id
            return likeDoc.get()
        }else{
            return res.status(404).json({error:'love not found'})
        }
    })
    .then(data=>{
        if (data.empty){
            return res.status(400).json({ message: 'tdk di like'})
        } else {
            return db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(()=>{
                loveData.likeCount--
                return loveDoc.update({likeCount: loveData.likeCount})
            })
            .then(()=>{
                return res.json(loveData)
            })
        }
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}

// delete love

exports.delLove = (req,res)=>{
    const document = db.doc(`/loves/${req.params.loveId}`)
    document.get()
    .then(doc=>{
        if (!doc.exists){
            return res.status(404).json({error: 'love not found'})
        }
        if(doc.data().userName !== req.user.handle){
            return res.status(403).json({error: 'unauth'})
        }else{
            return document.delete()
        }
    })
    .then(()=>{
        res.json({message:'delete success'})
    })
    .catch (err=>{
        console.error(err)
        return res.status(500).json({error: err.code})
    })
}