
const DEBUG = true;
const CANVAS_INPUT_ID = "camera";
const CANVAS_OUTPUT_ID = "output";
const CANVAS_PROCESS_ID = "process";
const CANVAS_LOADER_ID = "loader";

const WORKER_URL = "../trigger-cv.worker.js";
const OPENCV_URL = "../opencv.js";
const images = [
    { name: 'image1', url: '/index.htm#found', image: 'images/skull.jpg', minFeatures: 16, data: null },
];

let videoInput = document.getElementById(CANVAS_INPUT_ID);
let canvasOutput = document.getElementById(CANVAS_OUTPUT_ID);
let canvasProcess = document.getElementById(CANVAS_PROCESS_ID);
let canvasLoader = document.getElementById(CANVAS_LOADER_ID);

canvasLoader.style.display = 'none';

let canvasProcessContext = canvasProcess.getContext('2d');

let processing = false;

startCamera('qvga', onVideoStarted, CANVAS_INPUT_ID);

function loadImagesData(images) {
    function loadImageToCanvas(url) {
        return new Promise(function (resolve, reject) {
            let canvas = document.getElementById(CANVAS_LOADER_ID);
            
            let ctx = canvas.getContext('2d');
            let img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                try {
                    ctx.drawImage(img, 0, 0, img.width, img.height);
                    let imageData = ctx.getImageData(0, 0, img.width, img.height);
                    resolve(imageData);
                }catch(err) {
                    reject('failed to load image ' + this.src);    
                }
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
            images[index].data = imageData;
        }).catch((e) => {
            Promise.reject(e);
        });
    });
    return Promise.all(actions);
}


function onVideoCanPlay() {
    if (self.onCameraStartedCallback) {
        self.onCameraStartedCallback(self.stream, self.video);
    }
};

function startCamera(resolution, callback, videoId) {
    const constraints = {
        'qvga': { width: { exact: 320 }, height: { exact: 240 } },
        'vga': { width: { exact: 640 }, height: { exact: 480 } }
    };
    let video = document.getElementById(videoId);
    
    let videoConstraint = constraints[resolution];
    if (!videoConstraint) {
        videoConstraint = true;
    }

    navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false })
        .then(function (stream) {
            video.srcObject = stream;
            video.play();
            self.video = video;
            self.stream = stream;
            self.onCameraStartedCallback = callback;
            video.addEventListener('canplay', onVideoCanPlay, false);
        })
        .catch(function (err) {
            console.log('Camera Error: ' + err.name + ' ' + err.message);
        });
};





startAndStop.addEventListener('click', () => {
    if (!processing) {
        processing = true;
        startAndStop.innerText = 'Stop';
        videoInput.width = videoInput.videoWidth;
        videoInput.height = videoInput.videoHeight;
        canvasProcess.width = videoInput.videoWidth;
        canvasProcess.height = videoInput.videoHeight;
        // nextFrame();
        

        let video = document.getElementById(CANVAS_INPUT_ID);
        let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        let cap = new cv.VideoCapture(video);

        const FPS = 30;
        function processVideo() {
            try {
                if (!processing) {
                    // clean and stop.
                    src.delete();
                    return;
                }
                let begin = Date.now();
                // start processing.
                cap.read(src);
                let url = triggerCv.processFrame(src);

                if (url) {
                    console.log(`Found ${url}`);
                }
                // schedule the next one.
                let delay = 1000/FPS - (Date.now() - begin);
                setTimeout(processVideo, delay);
            } catch (err) {
                console.log(err);
                return;
            }
        };

        setTimeout(processVideo, 0);
    } else {
        processing = false;
        startAndStop.innerText = 'Start';
    }
});




function nextFrame() {
    if (!processing) {
        return;
    }

    let imageData;
    canvasProcessContext.drawImage(videoInput, 0, 0, videoInput.videoWidth, videoInput.videoHeight);
    try {
        console.log('.')
        imageData = canvasProcessContext.getImageData(0, 0, canvasProcess.width, canvasProcess.height);
        
        // let cvImageData = cv.matFromImageData(imageData);
        let cvImageData = cv.imread(CANVAS_PROCESS_ID);
        let url = triggerCv.processFrame(cvImageData);

        if (url) {
            console.log(`Found ${url}`);
        }

    } catch (error) {
        processing = false;
        startAndStop.innerText = 'Start';
        console.log('Error processing...', error);
        return;
    }
    console.log('b')
    // requestAnimationFrame(nextFrame);
}


function onVideoStarted() {
    loadImagesData(images).then(() => {
        console.log('finished loading images and calculating features')
        
        
        loadOpenCv(() => {
            triggerCv.loadCvExtension();
            
            console.log(videoInput.videoWidth)
            triggerCv.addObjectsToDetect(images, videoInput.videoWidth)
        
            startAndStop.removeAttribute('disabled');
        });
        
        
    }).catch((err) => {
        console.log('faile', err);
    });


}

function loadOpenCv(onloadCallback) {
    let script = document.createElement('script');
    script.setAttribute('async', '');
    script.setAttribute('type', 'text/javascript');
    script.addEventListener('load', async () => {
        if (cv.getBuildInformation)
        {
            console.log(cv.getBuildInformation());
            onloadCallback();
        }
        else
        {
            // WASM
            if (cv instanceof Promise) {
                cv = await cv;
                console.log(cv.getBuildInformation());
                onloadCallback();
            } else {
                cv['onRuntimeInitialized']=()=>{
                    console.log(cv.getBuildInformation());
                    onloadCallback();
                }
            }
        }
    });
    script.addEventListener('error', () => {
        self.printError('Failed to load ' + OPENCV_URL);
    });
    script.src = OPENCV_URL;
    let node = document.getElementsByTagName('script')[0];
    node.parentNode.insertBefore(script, node);
};