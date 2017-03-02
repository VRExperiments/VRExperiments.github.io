window.onload = function() {
 
 	dataRollx = 0;
	dataRolly = 0;
	dataRollz = 0;

  var a_box = document.querySelector('a-box');
  var text;   // variable for the text div you'll create
  var socket = new WebSocket("ws://localhost:8081");
  function setup() {
    // The socket connection needs two event listeners:
    socket.onopen = openSocket;
    socket.onmessage = showData;
    // make a new div and position it at 10, 10:

  }
  function openSocket() {
    socket.send("Hello server");
  }
  /*
  showData(), below, will get called whenever there is new Data
  from the server. So there's no need for a draw() function:
  */
  function showData(result) {
    // when the server returns, show the result in the div:
    var res = result.data.split(" ");
    console.log("Sensor reading:" + res[1] + " " + res[2] + " " + res[3]);
    dataRollx = res[1];
    dataRolly = res[2];
    dataRollz = res[3];
  }



	var clock = new THREE.Clock();
	var intervalID;
	var scene, povCamera, renderer, controls, stats;
	var windowWidth, windowHeight;
	var maleHead, femaleHead;
	var orbiter, pattern = 1, orbitSpeed = 0.01;
	var orbiter2, pattern = 1, orbitSpeed2 = 0.01;		
	var audioElement, panner, masterGain;
	var audioElement2, panner2, masterGain2;
	var subjects = [], currentSubject = {}, currentSubjectIndex = -1;
	var tracks = [
		"assets/audio/ibm.mp3"
	];
	var views = [
			{
				left: 0,
				bottom: 0,
				width: 0.7,
				height: 1.0,
				background: new THREE.Color().setRGB(0.5, 0.5, 0.7),
				pos: [0, 0, 0],
				up: [0, 1, 0],
				lookAt: [0, 0, 1],
				fov: 45,
			},
			{
				left: 0.7,
				bottom: 0.5,
				width: 0.3,
				height: 0.5,
				background: new THREE.Color().setRGB(0.7, 0.5, 0.5),
				pos: [3, 0, 0],
				up: [0, 1, 0],
				lookAt: [0, 0, 0],
				fov: 45,
			},
			{
				left: 0.7,
				bottom: 0,
				width: 0.3,
				height: 0.5,
				background: new THREE.Color().setRGB(0.5, 0.7, 0.5),
				pos: [0, 3, 0],
				up: [0, 1, 0],
				lookAt: [0, 0, 0],
				fov: 45
			}
	];

	init();
	animate();


	


	function init() {

		stats = initStats();
		scene = new THREE.Scene();
		for (var i = 0; i < views.length; ++i) {
			var view = views[i];
			var camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 0.5, 100);
			camera.position.set(view.pos[0], view.pos[1], view.pos[2]);
			camera.up.set(view.up[0], view.up[1], view.up[2]);
			camera.lookAt(new THREE.Vector3(view.lookAt[0], view.lookAt[1], view.lookAt[2]));
			scene.add(camera);
			view.camera = camera;
		}
		povCamera = views[0].camera;

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		document.body.appendChild(renderer.domElement);

		controls = new THREE.FlyControls(views[0].camera, renderer.domElement);
		controls.movementSpeed = 0;
		controls.rollSpeed = Math.PI / 6;
		controls.autoForward = false;
		controls.dragToLook = true;

		var light = new THREE.PointLight(0xffffff);
		light.position.set(1, 2, -1);
		scene.add(light);

		// orbiter
		orbiter = new THREE.Mesh(new THREE.SphereGeometry(0.1, 64, 64), new THREE.MeshPhongMaterial({ color: 0xCCCCCC }));
		scene.add(orbiter);
		orbiter2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 64, 64), new THREE.MeshPhongMaterial({ color: 0x000000 }));
		scene.add(orbiter2);

		cube = new THREE.Mesh( new THREE.CubeGeometry( 64, 64, 64 ), new THREE.MeshPhongMaterial({ color: 0xCCCCCC }));
		cube.position.y = 10;


	    scene.add( cube );

		// wireframe sphere
		scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true })));

		loadHeadModels(function() { loadSubjectsData(); });
	}

	function initAudio() {

		try {
			var audioContext = new (window.AudioContext || window.webkitAudioContext)();
		}
		catch (e) {
			alert("Web Audio API is not supported in this browser");
		}

		audioElement = document.getElementById("player");
		var source = audioContext.createMediaElementSource(audioElement);

		audioElement2 = document.getElementById("player2");
		var source2  = audioContext.createMediaElementSource(audioElement2);

		masterGain = audioContext.createGain();
		masterGain.connect(audioContext.destination);
		masterGain.gain.value = 0.6;
		panner = new HRTFPanner(audioContext, source, currentSubject.hrtfContainer);
		panner2 = new HRTFPanner(audioContext, source2, currentSubject.hrtfContainer);
		console.log("panner2")
		panner.connect(masterGain);
		panner2.connect(masterGain);
		intervalID = setInterval(updatePanner, 50);
		audioElement.play();
		audioElement2.play();
	}

	function initStats() {

		var stats = new Stats();
		stats.setMode(0);

		stats.domElement.style.position = "absolute";
		stats.domElement.style.left = "0px";
		stats.domElement.style.top = "30px";

		document.body.appendChild(stats.domElement);

		return stats;
	}



	function hrirFilenameFromId(id) {

		id = parseInt(id);
		var filename = "HRTF/CIPIC/subject_";
		if (id < 100 && id >= 10)
			filename += '0';
		else if (id < 10)
			filename += '00';

		filename += id + ".bin";
		return filename;
	}

	function initGUI()
	{

	} 

	function loadHeadModels(onLoad) {

		var loader = new THREE.OBJMTLLoader();
		loader.load("assets/obj/head_F.obj", "assets/obj/head_F.mtl", function(object) {
			object.position.y -= 0.7;
			object.scale.set(2.2, 2.2, 2.2);
			object.rotation.y += Math.PI;
			views[0].camera.add(object);
			femaleHead = object;
			femaleHead.visible = false;

			var loader = new THREE.OBJLoader();
			loader.load("assets/obj/head_M.obj", function(object) {
				object.scale.set(0.015, 0.015, 0.015);
				object.rotation.y += Math.PI;
				views[0].camera.add(object);
				maleHead = object;
				maleHead.visible = false;
				onLoad();
			});
		});
	}

	function loadSubject(subject, onLoad) {

		if (typeof subject.hrtfContainer == "undefined") {
			subject.hrtfContainer = new HRTFContainer();
			subject.hrtfContainer.loadHrir(hrirFilenameFromId(subject.id), onLoad);
		}
		else
			onLoad();

		for (var key in subject)
			currentSubject[key] = subject[key];
		if (subject.name == 'F') {
			femaleHead.visible = true;
			maleHead.visible = false;
		}
		else {
			femaleHead.visible = false;
			maleHead.visible = true;
		}
	}

	function loadSubjectsData() {

		var oReq = new XMLHttpRequest();
		oReq.open("GET", "HRTF/CIPIC/anthro.txt", true);
		oReq.onreadystatechange = function() {
			if (oReq.readyState === 4) {
				var lines = oReq.responseText.split('\n');
				for (var i = 1; i < lines.length; ++i) {
					var tokens = lines[i].split(';');
					subjects.push({
						id: tokens[0],
						name: tokens[1],
						headWidth: tokens[2],
						headHeight: tokens[3],
						headDepth: tokens[4]
					});
				}
				loadSubject(subjects[0], function() {
					initAudio();
					initGUI();
					currentSubjectIndex = 0;
				});

			}
		}
		oReq.send();
	}

	function animate() {

		requestAnimationFrame(animate);
		render();
		update();
	}

	var t = 0;
	function animateSource() {

		var R = 1;
		orbiter.lookAt(scene.position);
		orbiter2.lookAt(scene.position);
		
		orbiter.position.x = R * Math.cos(t);
		orbiter.position.y = 0;
		orbiter.position.z = R * Math.sin(t);

		orbiter2.position.x = -R * Math.cos(t);
		orbiter2.position.y = 0;
		orbiter2.position.z = -R * Math.sin(t);

		t += orbitSpeed;
	}

	function update() {

		controls.update(clock.getDelta());
		stats.update();
		updateSize();
		animateSource();
		updateOrientation();
	}

	function updateOrientation() {
		console.log("Sensor reading:" + dataRollx + " " + dataRolly + " " + dataRollz);
	}

	function updatePanner() {
		
		// calculate source position relative to the listener (camera)
		var mInverse = new THREE.Matrix4().getInverse(povCamera.matrixWorld);
		var sourcePos = orbiter.position.clone();
		sourcePos.applyMatrix4(mInverse);
		var cords = cartesianToInteraural(sourcePos.x, -sourcePos.z, sourcePos.y);
		panner.update(cords.azm, cords.elv);

		var mInverse = new THREE.Matrix4().getInverse(povCamera.matrixWorld);
		var sourcePos = orbiter.position.clone();
		sourcePos.applyMatrix4(mInverse);
		var cords = cartesianToInteraural(sourcePos.x, -sourcePos.z, sourcePos.y);
		panner2.update(cords.azm, cords.elv);

	}
	
	function updateSize() {

		if (windowWidth != window.innerWidth || windowHeight != window.innerHeight) {

			windowWidth = window.innerWidth;
			windowHeight = window.innerHeight;

			renderer.setSize(windowWidth, windowHeight);
		}
	}

	function render() {

		for (var i = 0; i < views.length; ++i) {

			view = views[i];
			camera = view.camera;

			var left = Math.floor(window.innerWidth * view.left);
			var bottom = Math.floor(window.innerHeight * view.bottom);
			var width = Math.floor(window.innerWidth * view.width);
			var height = Math.floor(window.innerHeight * view.height);
			renderer.setViewport(left, bottom, width, height);
			renderer.setScissor(left, bottom, width, height);
			renderer.enableScissorTest(true);
			renderer.setClearColor(view.background);

			camera.aspect = width / height;
			camera.updateProjectionMatrix();

			renderer.render(scene, camera);
		}

	}
}