import * as THREE from '../node_modules/three/build/three.module.js';
import * as GLTFLoader from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import * as CONTROLS from '../node_modules/three/examples/jsm/controls/OrbitControls.js';

(function () {
	const API = {
	  key: '78ac5fdc69419cf96f7db810885b1301',
	  baseWeather: 'https://api.openweathermap.org/data/2.5/',
	  baseGeo: 'http://api.openweathermap.org/geo/1.0/'
	}

	const ASSETS = {
		sun: {icon:'assets/icons/sun.png', bgi: 'assets/sun-bg.png'},
		rain: {icon:'assets/icons/rain.png', bgi: 'assets/rain-bg.png'},
		cloud: {icon: 'assets/icons/cloud.png', bgi: 'assets/cloud-bg.png'},
		snow: {icon: 'assets/icons/snow.png', bgi: 'assets/snow-bg.png'},
		storm: {icon: 'assets/icons/storm.png',	  bgi: 'assets/storm-bg.png'}
	}

	const WEEKDAYS = [
	  'Sunday',
	  'Monday',
	  'Tuesday',
	  'Wednesday',
	  'Thursday',
	  'Friday',
	  'Saturday'
	];

	const SEARCHBOX = document.querySelector('.search-box');
	const NAVDAYS = document.querySelectorAll('.day');
	var weather3dModel = 'sun';
	var previousModel = null;
	var mainBg = null;
	var selectedDay = document.querySelector('.selected-day');
	var mainTempText = document.querySelector('.temperature').children[0];

	function setSearch() {
		SEARCHBOX.addEventListener('keypress', setQuery);
		document.querySelector('.search-icon').addEventListener('click', setQuery)

		for( var x = 0; x < NAVDAYS.length; x++) {
			NAVDAYS[x].addEventListener('click', changeDay);
		}
	}
	setSearch();

	function setQuery(evt) {
	  if (evt.keyCode === 13 || evt.button === 0) {
		document.querySelector('.location-name').innerHTML = SEARCHBOX.value;
	    getLocationInfo(SEARCHBOX.value);
	  }
	}

	function getLocationInfo(query) {
		fetch(`${API.baseGeo}direct?q=${query}&APPID=${API.key}`)
	    .then(location => {
	      return location.json();
	    }).then(getLocationLatLon);
	}

	function getLocationLatLon(loc) {
		let location = loc;

		if(location.length == 0) {
			//SEARCHBOX.style.backgroundColor = 'red';
			SEARCHBOX.classList.add('errorInput');
			return;
		}

		let lat = location[0].lat;
		let lon = location[0].lon;
		getResults(lat,lon);
	}

	function getResults (lat,lon) {
	  fetch(`${API.baseWeather}onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly,alerts&APPID=${API.key}`)
	    .then(weather => {
	      return weather.json();
	    }).then(displayResults);
	}

	function changeDay() {
		let day = this;
		let weekdayTemp = day.getAttribute("weekday");
		selectedDay.innerHTML = weekdayTemp;
		let mainTemp = day.getAttribute("temp") + "°C";
		mainTempText.innerHTML = mainTemp;
		weather3dModel = day.getAttribute('weather');
		var newBgi = ASSETS[weather3dModel];
		mainBg.style.backgroundImage = "url('" + newBgi.bgi + "')";

		for( var x = 0; x < NAVDAYS.length; x++) {
			NAVDAYS[x].classList.remove("active");
		}

		day.classList.add("active");
		THREEJSMODULE.setModel();
	}

	function displayResults (weather) {
		mainBg = document.querySelector('.main-bg');
		let x = document.querySelectorAll('.day');

		document.querySelector('.landing-page').classList.add('hide');
		document.querySelector('.weather-search').classList.add('show');
		mainTempText.innerHTML = weather.daily[0].temp.day + "°C";

		for(let i = 0; i < 7; i++) {
			let day = x[i];
			let daily = weather.daily[i];

			let milliseconds = daily.dt * 1000;
			let dateObject = new Date(milliseconds);
			let humanDateFormat = dateObject.toLocaleString();
			let weekday = WEEKDAYS[dateObject.getDay()];
			day.setAttribute('weekday', weekday);
			let mainWeather = daily.weather[0].main;

			if(i == 0) {
				selectedDay.innerHTML = weekday;
			}

			day.childNodes[3].innerText = daily.temp.day + "°C";
			day.setAttribute('temp',daily.temp.day);

			switch(mainWeather) {
				case 'Clear':
					setDay(day,'sun',ASSETS.sun,i);
				break;

				case 'Clouds':
					setDay(day,'cloud',ASSETS.cloud,i);
				case 'Drizzle':
				case 'Rain':
					setDay(day,'rain',ASSETS.rain,i);
					break;

				case 'Thunderstorm':
					setDay(day,'storm',ASSETS.storm,i);
					break;

				case 'Snow':
					setDay(day,'snow',ASSETS.snow,i);
				  	break;

				default:
					setDay(day,'sun',ASSETS.sun,i);
					break;
			}
		}

		THREEJSMODULE.init();
	}

	function setDay(dayElement,weather,weatherAssets,dayNum) {
		dayElement.setAttribute('weather', weather);
		dayElement.children[0].setAttribute('src',weatherAssets.icon);
		mainBg.style.backgroundImage = "url('" + weatherAssets.bgi + "')";

		if(dayNum == 0) {
			weather3dModel = weather;
		}
	}

	var THREEJSMODULE = (function() {

		var light = null;
		var loader = null;
		var renderer = null;
		var scene = null;
		var controls = null;
		var camera = null;

		function initThreejs() {
			loader = new GLTFLoader.GLTFLoader();
			var renderCalls = [];

			function render () {
			  requestAnimationFrame( render );
			  renderCalls.forEach((callback)=>{ callback(); });
			}
			render();

			scene = new THREE.Scene();

			camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 800 );
			camera.position.set(1,1,8);

			setRender();

			window.addEventListener( 'resize', function () {
			  camera.aspect = window.innerWidth / window.innerHeight;
			  camera.updateProjectionMatrix();
			  resizeModel();
			  renderer.setSize( window.innerWidth, window.innerHeight );
			}, false );

			const plane = document.querySelector('.weather-object');
			plane.appendChild(renderer.domElement);

			function renderScene(){ renderer.render( scene, camera ); }
			renderCalls.push(renderScene);
			
			setLights();
			setControls();
			loadModel();
			animate();
		}

		function loadModel() {
			loader.load(
				'assets/models/' + weather3dModel + '.gltf',
				function ( gltf ) {
					gltf.name = weather3dModel;
					scene.remove(previousModel);
					previousModel = gltf.scene;	
					scene.add(gltf.scene);
					resizeModel();
				},
				function ( xhr ) {
					console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
				},
				function ( error ) {
					console.log( 'An error happened' + error);
				}
			);
		}

		function animate() {
		    requestAnimationFrame(animate);
		    controls.update();
		    renderer.render(scene, camera);
		}

		function resizeModel() {
			if(window.innerWidth < 768) {
			  	previousModel.scale.set(1.7,1.7,1.7);
			}
			else {
			  	previousModel.scale.set(2.5,2.5,2.5);
			}
		}

  		function setLights() {
			const directionalLightUp = new THREE.DirectionalLight( 0x404040, 4.5 );
			directionalLightUp.position.set(0, 0, 25);
			scene.add( directionalLightUp );

			const directionalLightSide = new THREE.DirectionalLight( 0x404040, 4.5 );
			directionalLightSide.position.set(0, 25, -25);
			scene.add( directionalLightSide );

			const directionalLightDown = new THREE.DirectionalLight( 0x404040, 1 );
			directionalLightDown.position.set(0, -25, 0);
			scene.add( directionalLightDown );
  		}

  		function setRender() {
  			renderer = new THREE.WebGLRenderer( { alpha: true } );
			renderer.setPixelRatio( window.devicePixelRatio );
			renderer.setSize( window.innerWidth, window.innerHeight );
			renderer.setClearColor( 0x000000, 0 );
			renderer.toneMapping = THREE.LinearToneMapping;
			renderer.toneMappingExposure = Math.pow( 0.94, 5.0 );
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFShadowMap;
  		}

  		function setControls() {
  			controls = new CONTROLS.OrbitControls(camera,renderer.domElement);
			controls.autoRotate = true;
			controls.autoRotateSpeed = 1;
			controls.target = new THREE.Vector3(.5, .5, .5);
			controls.enableZoom = false;
  		}

  		return {
		    init:initThreejs,
		    setModel:loadModel
  		}

	})();
})();
