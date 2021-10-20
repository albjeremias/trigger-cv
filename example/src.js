const DEBUG = true;
const CANVAS_NAME = "canvasImageToDetect";

const images = [
    { name: 'image1', url: '/index.htm#found', image: 'image1.jpg', minFeatures: 16 },
];


// opencvWorker.worker.postMessage({msg: "process", imageData: imageData});
    // opencvWorker.nextFrameOpenCv = false;

loadImagesData(images).then(() => {

    // triggerEvent imagesLoaded
    opencvWorker.load('../trigger-cv.worker.js');
    if (DEBUG !== 'false') {
        console.log('starting worker for open cv....')
    }
    opencvWorker.worker.postMessage({ msg: "load" });
    opencvWorker.worker.onmessage = (ev) => {
        opencvWorkerListener(ev);
    }

}).catch((e) => {
    if (DEBUG !== 'false')
        console.log("Opencv not loading, failed to load detecting images" + e)
});


function opencvWorkerListener(ev) {
    switch (ev.data.msg) {
        case "loaded": {
            if (DEBUG !== 'false')
                console.log('opencv is loaded');

            // triggerEvent opencvLibLoaded
            opencvWorker.worker.postMessage({
                msg: "loadWef",
                imagesToDetect: images,
                videoWidth: this.video.videoWidth
            });
            break;
        }
        case "wefLoaded": {
            this.setOpencvStatus("loaded images to detect, opencv ready!");
            // triggerEvent opencvWorkerLoaded
            break;
        }
        case "found": {

            console.log('image detected', ev.data);
            break;
        }
        case "nextFrame": {
            opencvWorker.nextFrameOpenCv = true;
        }
    }
}




function loadImagesData(images) {
    function loadImageToCanvas(url) {

        return new Promise(function (resolve, reject) {
            let canvas = document.getElementById(CANVAS_NAME);
            let ctx = canvas.getContext('2d');
            let img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                let imageData = ctx.getImageData(0, 0, img.width, img.height)
                resolve(imageData);
            };
            img.onerror = function () {
                reject('failed to load image ' + this.src);
            }
            img.src = url;
        });
    }

    var actions = images.map((imageToDetect, index) => {
        if (DEBUG !== 'false') {
            console.log('Loading image: ' + imageToDetect.image)
        }
        return loadImageToCanvas(imageToDetect.image).then((imageData) => {
            this.imagesToDetect[index].data = imageData;
        }).catch((e) => {
        });
    });
    return Promise.all(actions);
}