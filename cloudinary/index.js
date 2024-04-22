const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        let folder, resource_type, format;
        if (file.fieldname === 'image' || file.fieldname === 'teamImage' || file.fieldname === "captureImage") {
            folder = 'Club Website/Images';
            resource_type = 'image';
            format = 'jpg';
        } else if (file.fieldname === 'audio') {
            folder = 'Club Website/Audio';
            resource_type = 'raw';
            format = 'mp3';
        }
        return {
            folder: folder,
            resource_type: resource_type,
            format: format
        };
    }
});


module.exports = {
    cloudinary,
    storage,
}