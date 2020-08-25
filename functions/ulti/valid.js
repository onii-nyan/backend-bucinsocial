const { userRecordConstructor } = require("firebase-functions/lib/providers/auth");

// check if field no empty
const isEmail=(email)=>{
    const regEx=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true
    else return false
}

const isEmpty = (string)=>{
    if(string.trim() === '') return true
    else return false
}

exports.SignUpValid = (data) =>{
    let errors={};

    if (isEmpty(data.email)){
        errors.email='must not be empty'
    } else if(!isEmail(data.email)){
        errors.email= 'must valid email'
    }

    if (isEmpty(data.password)) errors.password='must not be empty'
    if (isEmpty(data.handle)) errors.handle='must not be empty'

    // confirm password
    // if (data.confirmPassword !== data.cofirmPassword) errors.confirmPassword ='passwords not match'
    
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.LoginValid = (data) =>{
    let errors={};

    if (isEmpty(data.email)){
        errors.email='must not be empty'
    }
    if(isEmpty(data.password)){
        errors.password= 'must not be empty'
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.reduceUserProfile =(data)=>{
    let userProfile={}
    if (!isEmpty(data.bio.trim())) userProfile.bio = data.bio
    if (!isEmpty(data.bias.trim())) userProfile.bias = data.bias
    if (!isEmpty(data.website.trim())){
        if(data.website.trim().substring(0,4) !== 'http'){
            userProfile.website = `http://${data.website.trim()}`
        } else userProfile.website =data.website
    }
    if (!isEmpty(data.location.trim())) userProfile.location=data.location

    return userProfile
}