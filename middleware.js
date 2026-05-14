import jwt from 'jsonwebtoken';

const auth = (req,res,next) =>{
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                message:"Access Denied , No Token Provided"
            });
        }
        const secret = process.env.JWT_SECRET;
        if(!secret){
            console.error("JWT_SECRET is not defined in environment variables");
            return res.status(500).json({
                message:"Access Denied , No Secret Key Provided in Environment Variables"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded =jwt.verify(token,secret);
        if(!decoded.id){
            console.error("Decoded token does not contain valid id");
            return res.status(401).json({
                message:"Access Denied , No Token Provided with valid id "
            });       
        }

        req.user=decoded;
        next();
    }
    catch(error){
        if(error.name ==="JsonWebTokenError"){
            return res.status(401).json({
                message:"Access Denied , Invalid Token"
            })
        }
        if(error.name ==="TokenExpiredError"){
            return res.status(401).json({
                message:"Token is Expired ,Please Login Again"
            })
        }
        if(error.name ==="NotBeforeError"){
            return res.status(401).json({
                message:"The Token is not Active yet, Please Try Again Later"
            })
        }
    }

    console.error("Auth Middleware Error", error);
    return res.status(500).json({
        message:"Authentication Error"
    })

}
export default auth;