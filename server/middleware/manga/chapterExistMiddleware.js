const httpReq = require("request-promise")
const url = "https://www.mangakakalot.gg/"

const mangaExist = (req, res, next) => {

    const mangaUrl = `${url}/chapter/${req.params.id}/${req.params.ch}`

    httpReq(mangaUrl)
        .then((html) => {
            const httpState = false //Todo : if there is 404 text 

            if (httpState) {
                res.status(404).json({
                    state: 404,
                    message: "Manga Not Exist"
                })
            } else {
                req.html = html
                next()
            }
        })
        .catch((e) => {
            res.status(500).json({
                state: 500,
                message: "Something goes wrong"
            })
        })
}

module.exports = mangaExist