const projectService = require("../services/Projects");
const httpStatus = require("http-status");
const {passwordToHash, generateAccessToken, generateRefreshToken} = require("../scripts/utilities/helper");
const uuid = require("uuid")
const events = require("events")
const path = require("path");
const eventEmitter = require("../scripts/events/eventEmitter");
const nodemailer = require("nodemailer");
const uploadHelper = require("../scripts/utilities/uploads");
const UserService = require("../services/Users");
const service = new UserService();
class User{
create(req,res) {
    req.body.password = passwordToHash(req.body.password)
    service.insert(req.body).then((response)=>{
        res.status(httpStatus.CREATED).send(response)
    })
        .catch((e)=>{
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e)
        })
}

login(req,res){
    req.body.password = passwordToHash(req.body.password)
    service.read(req.body).then((response)=>{
        if(!response) return res.status(httpStatus.NOT_FOUND).send({message:"Böyle Bir Kullanıcı Bulunamadı"})

        response = {
            ...response.toObject(),
            tokens:{
                access_token : generateAccessToken(response),
                refresh_token : generateRefreshToken(response)
            },
        };
        delete response.password;

        res.status(httpStatus.OK).send(response)
    })
        .catch((e)=>{
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e)
        })
}

index(req,res) {
    service.list().then((response)=>{
        res.status(httpStatus.OK).send(response);
    })
        .catch((e)=>{
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e)
        })

}

projectList(req,res){
    service.list({user_id: req.user?._id}).then((response)=>{
        res.status(httpStatus.OK).send(response)
    }).catch((e)=>{
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e);
    })
}

resetPassword(req,res){
    const new_password = uuid.v4()?.split("-")[0] || new Date().getTime();
    service.modify({email: req.body.email}, {password: passwordToHash(new_password)}).then((response) => {
        if (!response) {
            return res.status(httpStatus.NOT_FOUND).send({error: "böyle bir kullanıcı bulunmamaktadır"})
        }

        eventEmitter.emit("send_email", {
            to: req.body.email,
            subject: "Şifre Sıfırlama", // Subject line
            html: `Şifre Sıfırlandı<br/>Yeni Şifre<br/><b>Şifre:${new_password}</b>`, // html body
        })

        res.status(httpStatus.OK).send("isteğiniz üzerine sıfırlama işlemi oluşmuştur epastaya bak");

    }).catch((e)=>{
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e)
    })
}

update(req,res) {
    service.modify({id:req.user?._id},req.body).then((response)=>{
        res.status(httpStatus.OK).send(response)
    })
        .catch((e)=>{
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send("e");
        })
}

deleteUser(req,res){
    if(!req.params?.id){
        res.status(httpStatus.BAD_REQUEST).send("id gönderilmedi");
    }

    service.remove(req.params?.id).then((response)=>{
        if(!response){
            res.status(httpStatus.NOT_FOUND).send("böyle bir kullanıcı bulunmamaktadır")
        }
        res.status(httpStatus.OK).send(response);
    }).catch((e)=>{
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e)
    })
}

changePassword(req,res) {
    req.body.password = passwordToHash(req.body.password);
    service.modify({id:req.user?._id},req.body).then((response)=>{
        res.status(httpStatus.OK).send(response)
    })
        .catch((e)=>{
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send("e");
        })
}


updateProfileImage(req,res) { 
    //eski
//     if(!req?.files?.profile_image){
//      return res.status(httpStatus.BAD_REQUEST).send("profil resmi gönderilmedi");
//  }
//  const extension = path.extname(req.files.profile_image.name);
//  const fileName = `${uuid.v4()}.${extension}`;
//  const folderPath = path.join(__dirname,"../","uploads/users",fileName);
//  req.files.profile_image.mv(folderPath, function(err) {
//      if(err){
//             return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
//      }
//      modify({_id:req.user._id},{profil_image:fileName}).then((response)=>{
//          res.status(httpStatus.OK).send({message:"işlem başarılı"});
//      }).catch((e)=>{
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e);
//      })
//  });

//yeni
const filePath = uploadHelper("users",req,res);

service.modify({_id:req.user._id},{profil_image:filePath}).then((response)=>{
res.status(httpStatus.OK).send(response);
})
.catch((e)=>{
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e);

})
}
}

module.exports =new User();
