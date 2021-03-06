const router = require('express').Router();
const fetch = require('node-fetch');
const { User } = require('../../models');


// 프론트에서 
// { accesstoken : accesstoken, nickname : "dfdfdf", sns : "kakao"}
// 
// 만들고
// nickname, id보내주기 {nickname : "n", id : 123}
// 만들기 전부터 있었다면 client의 오류로 분기
    
// '/login/set_nickname'
router.post('/', async (req,res) => {
    const sns_url = {
        "kakao" : "https://kapi.kakao.com/v1/user/access_token_info",
        "naver" : "https://openapi.naver.com/v1/nid/me",
        "google" : "https://oauth2.googleapis.com/tokeninfo?id_token="
    }
    
    const { accesstoken, nickname, sns } = req.body;
    const options = {}
    let uid;

    if (sns === "google")
        sns_url[sns] += accesstoken;
    else
        options["headers"] = { "Authorization" : "Bearer " + accesstoken }


    try {
        let user_info;
        if (sns === "google")
            user_info = await fetch(sns_url[sns]).then(data => data.json())
        else 
            user_info = await fetch(sns_url[sns], options).then(data => data.json())
        if (user_info === 'undefined') throw 'bad accesstoken'

        if (sns === "google") uid = user_info.sub;
        else if (sns === "naver") uid = user_info.response.id;
        else if (sns === "kakao") uid = user_info.id;
        else throw 'non-existent sns';

        // findOrcreate로 없을 시 생성하는 코드로 교체 가능
        const userExist = await User.findOne({
            where : {
                snsId : uid,
                sns : sns
            }
        })

        if (userExist === null) {
            const userCreated = await User.create({
                snsId : uid,
                sns : sns,
                nickname : nickname,
            })
            res.send({"nickname" : userCreated.nickname, "id" : userCreated.id});
        } 
        else throw 'exist id in database'
    }
    catch (err) {
        // 1. accesstoken이 잘못됨
        // 2. 존재하지 않는 sns
        // 3. user row 생성에서의 err
        if (err === 'bad accesstoken' || err === 'non-existent sns' || err === 'exist id in database')
            res.status(412).send({'msg' : err, 'code' : -412})
        else res.status(500).send({'msg' : 'server error', 'code' : -500});
    }

})

module.exports = router;