/*eslint-disable */
const MAX_FEATURES = 200;
const MIN_GOOD_MATCHES = 8;

var triggerCv = {
  objectsToDetect: [],
  scene: {
    gray: null,
    kp: null,
    descriptors: null,
  },
  matcher: {
    matches: null,
    bf: null,
    orb: null,
  },
  allocated: false,
  setDescriptorsObject: function(imObject, descriptorsObject, kpObject) {
    let orb = new cv.ORB();
    let imObjectGray = new cv.Mat();

    orb.setMaxFeatures(MAX_FEATURES);

    cv.cvtColor(imObject, imObjectGray, cv.COLOR_RGBA2GRAY, 0);
    orb.detectAndCompute(imObjectGray, new cv.Mat(), kpObject, descriptorsObject);

    imObjectGray.delete();
    orb.delete();
  },
  allocate(){
    this.matcher.orb = new cv.ORB();
    this.scene.gray = new cv.Mat();
    this.scene.kp = new cv.KeyPointVector();
    this.scene.descriptors = new cv.Mat();
    this.scene.mask = new cv.Mat();
    this.matcher.bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
  },
  processFrame: function(imScene, imResult = false, drawResult = false) {

    let iRet = -1;
    // Convert images to grayscale
    cv.cvtColor(imScene, this.scene.gray, cv.COLOR_RGBA2GRAY, 0);

    // Detect ORB features and compute descriptors.
    this.matcher.orb.setMaxFeatures(MAX_FEATURES);
    this.matcher.orb.detectAndCompute(this.scene.gray, new cv.Mat(), this.scene.kp, this.scene.descriptors);

    let matchDistanceMin = 100;
    let matchDistanceMax = 0;

    this.matcher.matches = new cv.DMatchVector();

    if (this.scene.descriptors.size().width < 1 || this.scene.descriptors.size().height < 1) {
      return false;
    }

    for (let i = 0; i < this.objectsToDetect.length; i++) {
      // Match descriptors.
      this.objectsToDetect[i].numberOfMatches = 0;

      this.matcher.bf.match(this.objectsToDetect[i].descriptors, this.scene.descriptors, this.matcher.matches, this.scene.mask)

      if (this.matcher.matches.size() > 1) {

        // Sort them in the order of their distance.
        this.matcher.matches.sort();

        matchDistanceMin = this.matcher.matches.get(0).distance;
        matchDistanceMax = this.matcher.matches.get(this.matcher.matches.size() - 1).distance;

        this.matcher.matches = this.matcher.matches.goodMatches( (matchDistanceMax / 2) - (matchDistanceMin * 0));
      }

      this.objectsToDetect[i].numberOfMatches = this.matcher.matches.size();
    }

    let probableImageIdx = 0;
    for (let i = 1; i < this.objectsToDetect.length; i++) {
      if (this.objectsToDetect[i].numberOfMatches >= this.objectsToDetect[probableImageIdx].numberOfMatches) {
        probableImageIdx = i;
      }
    }

    if (drawResult) {

      if (this.objectsToDetect[probableImageIdx].numberOfMatches > 0) {
        let debugText = ' size: ' + probableImageIdx + ' ' + this.objectsToDetect[probableImageIdx].numberOfMatches;
        cv.drawMatches(this.objectsToDetect[probableImageIdx].im, this.objectsToDetect[probableImageIdx].kp, imScene, this.scene.kp, this.matcher.matches, imResult, new cv.Scalar(0,255,0), new cv.Scalar(255,0,0))
        cv.putText(imResult, debugText, new cv.Point(0, 35), cv.FONT_HERSHEY_SIMPLEX, 1.5, new cv.Scalar(255, 0, 0, 255), 2);
      }
    }

    if (this.objectsToDetect[probableImageIdx].numberOfMatches > this.objectsToDetect[probableImageIdx].minFeaturesToMatch) {
      iRet = probableImageIdx;
    }
    if (iRet > -1 && drawResult) {
      cv.putText(imResult, 'FOUND!!', new cv.Point(0, 80), cv.FONT_HERSHEY_SIMPLEX, 1.5, new cv.Scalar(255, 0, 0, 255), 3);
    }

    this.matcher.matches.delete();
    if (iRet < 0) {
      return false;
    }

    return this.objectsToDetect[iRet].url;
  },
  loadCvExtension: function() {
    this.allocate();
    cv.DMatchVector.prototype.sort = function () {
      for (let i = 0; i < this.size(); i++) {
        for (let j = 0; j < this.size(); j++) {
          if (this.get(i).distance < this.get(j).distance) {
            let x = this.get(i);
            let y = this.get(j);
            this.set(i, y);
            this.set(j, x);
          }
        }
      }
    }

    cv.DMatchVector.prototype.resizeMe = function (length) {
      let matchesResized = new cv.DMatchVector();
      if (length > this.size()) {
        length = this.size();
      }
      for (let i = 0; i < length; i++) {
        matchesResized.push_back(this.get(i));
      }
      this.delete();
      return matchesResized;
    }

    cv.DMatchVector.prototype.print = function () {
      let string = '';
      for (let i = 0; i < this.size(); i++) {
        string = string + ',' + this.get(i).distance;
      }
      document.getElementById('output1').innerText = string;
    }

    cv.DMatchVector.prototype.goodMatches = function (max) {

      let matchesResized = new cv.DMatchVector();
      for (let i = 0; i < this.size(); i++) {
        if (this.get(i).distance < max) {
          matchesResized.push_back(this.get(i));
        }
      }
      this.delete();
      return matchesResized;
    }

    cv.DMatchVector.prototype.avg = function () {
      let total = 0;
      for (let i = 0; i < this.size(); i++) {
        total = total + this.get(i).distance;
      }
      return Math.round(total / this.size() * 100) / 100;
    }

    cv.DMatchVectorVector.prototype.print = function () {
      let string = '';
      for (let i = 0; i < this.size(); i++) {
        string = string + ',' + this.get(i).distance;
      }
      document.getElementById('output1').innerText = string;
    }

    cv.DMatchVectorVector.prototype.filter = function (kpObject, kpScene) {
      let ratio = 0.75;
      let matchesFiltered = new cv.DMatchVectorVector();
      for (let i = 0; i < this.size(); i++) {
        if (this.get(i).get(0) !== undefined) {
          debugger;
        }
      }
    }
    cv.ExtensionLoaded = true;
  },

  loadImageToCanvas: function (url, canvasId) {

    return new Promise(function (resolve, reject) {
      let canvas = document.getElementById(canvasId);
      let ctx = canvas.getContext('2d');
      let img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        resolve(true);
      };

      if(isiOS()) {
        resolveLocalFileSystemURL(cordova.file.applicationDirectory+'www/' + url, (f) => {
          f.file((file) => {
            const reader = new FileReader();

            reader.onloadend = function() {
              img.src = this.result;
            }
            reader.readAsDataURL(file)
          }, (error) => console.error(error));
        }, (err) => {console.error(err)});
      } else {
        img.src = url;
      }

    });
  },
  loadImagesToDetect(imagesToDetect, videoWidth, canvasName) {
    var actions = imagesToDetect.map((imageToDetect, index) => {
      return this.loadImageToCanvas(imageToDetect.image, canvasName).then(() => {
        return new Promise((resolve, reject) => { 
          resolve(this.addObjectToDetect(imageToDetect.name, imageToDetect.url, videoWidth, canvasName))
        });
      }); // run the function over all items
    });
    return Promise.all(actions);
  },
  loadImagesToDetectWithoutCanvas(imagesToDetect, videoWidth)
  {

    function loadImage(url) {

      return new Promise(function (resolve, reject) {
        let img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          resolve(img);
        };

        if(isiOS()) {
          resolveLocalFileSystemURL(cordova.file.applicationDirectory+'www/' + url, (f) => {
            f.file((file) => {
              const reader = new FileReader();

              reader.onloadend = function() {
                img.src = this.result;
              }
              reader.readAsDataURL(file)
            }, (error) => console.error(error));
          }, (err) => {console.error(err)});
        } else {
          img.src = url;
        }
      });
    }

    var actions = imagesToDetect.map((imageToDetect, index) => {
      return loadImage(imageToDetect.image).then((imageData) => {
        return new Promise((resolve, reject) => { 
          resolve(this.addObjectToDetect(imageToDetect.name, imageToDetect.url, videoWidth, false, imageData))
        });
      }); // run the function over all items
    });
    return Promise.all(actions);
  },
  addObjectsToDetect(imagesToDetect, videoWidth) {
    var actions = imagesToDetect.map((imageToDetect) => {
        return new Promise((resolve, reject) => { 
          resolve(this.addObjectToDetect(imageToDetect.name, imageToDetect.url, videoWidth, false, imageToDetect.data, imageToDetect.minFeatures))
        });
      }); // run the function over all items
    return Promise.all(actions);
  },
  addObjectToDetect: function(name, url, videoWidth, canvasName, imageData = false, minFeatures = 8) {
    let object = {
      descriptors: new cv.Mat(),
      kp: new cv.KeyPointVector(),
      im: null,
      gray: new cv.Mat(),
      name: name,
      url: url,
      mask: null,
      numberOfMatches: 0,
      minFeaturesToMatch: minFeatures,
    };
    
    if (canvasName) {
      object.im = cv.imread(canvasName);
    }else {
      object.im = cv.matFromImageData(imageData);
    }

    let scale = videoWidth / object.im.cols;
    if (scale < 1) { // only resizes if resolution of the video is lower!
      let newSize = {width : videoWidth, height : parseInt(object.im.rows * scale)};
      cv.resize(object.im, object.im, newSize);
    }

    let orb = new cv.ORB();
    orb.setMaxFeatures(MAX_FEATURES);

    cv.cvtColor(object.im, object.gray, cv.COLOR_RGBA2GRAY, 0);
    orb.detectAndCompute(object.gray, new cv.Mat(), object.kp, object.descriptors);

    object.gray.delete();
    orb.delete();

    this.objectsToDetect.push(object);
  }

};
