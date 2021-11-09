import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
// import { GUI } from 'dat.gui'

import {GUI} from "three/examples/jsm/libs/dat.gui.module";

import { Simulation } from './Simulation'

function init() {
    const camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

    camera.position.set(0, 2, 12);
    camera.lookAt(0,-3,0);

    const scene = new Scene();

    const light = new AmbientLight(0x404040); // soft white light
    scene.add(light);


    const light3 = new DirectionalLight(0x404040, 4); // soft white light
    light3.position.set(0,15,15);
    light3.lookAt(0,0,0);
    light3.shadow.autoUpdate = true;
    scene.add(light3);


    //
    // const light4 = new DirectionalLight(0x404040, 4); // soft white light
    // light4.position.set(-4,-2,0);
    // light4.lookAt(0,0,0);
    // scene.add(light4);


    const gui = new GUI( { width: 400 } );

    const simulation = new Simulation(scene, gui);

    const canvas = document.getElementById("canvas")

    const renderer = new WebGLRenderer({antialias: true, canvas: canvas as HTMLCanvasElement});
    renderer.setSize(window.innerWidth, window.innerHeight);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new Vector3(0,-3,0);

    controls.update();

    renderer.setAnimationLoop((time) => animation(time, camera, scene, renderer, simulation, controls));
}

function animation(time: number, camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, simulation: Simulation, controls: OrbitControls) {
    simulation.update(time);
    controls.update();
    renderer.render(scene, camera);
}

init()