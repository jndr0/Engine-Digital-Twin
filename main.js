import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.set(4, 5, 11);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 10;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.5;
controls.autoRotate = false;
controls.target = new THREE.Vector3(0, 1, 0);
controls.update();

const groundGeometry = new THREE.PlaneGeometry(20, 20, 32, 32);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x555555,
  side: THREE.DoubleSide,
});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.castShadow = false;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const spotLight = new THREE.SpotLight(0xffffff, 3000, 100, 0.22, 1);
spotLight.position.set(0, 25, 0);
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;
scene.add(spotLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const loader = new GLTFLoader().setPath("models/");
loader.load("motor/MotorGLTF.gltf", (gltf) => {
  console.log("loading model");
  const mesh = gltf.scene;

  mesh.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  mesh.position.set(0, 0.5, 0);
  mesh.scale.set(3, 3, 3);
  scene.add(mesh);
  let modelVisible = true; // Variable para rastrear si el modelo es visible o no
  let rodamiento; // Variable para rastrear el modelo
  // Crear un canvas para dibujar el mapa de calor
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  // Obtener los datos de InfluxDB
  axios({
    method: "post",
    url: "http://qartia.com:8086/api/v2/query?org=a64aef386037d501",
    headers: {
      Authorization:
        "Token u4jGFm6Sr0v9cjsX8y_yx6sMNPqv2SWOtz3j32Vvp6yCwpFOEwjGbmKk6880A3v0Y1zbsQ1E5J9SeT5zF96erw==",
      "Content-Type": "application/vnd.flux",
    },
    data: 'from(bucket: "Engine-UPCT")\
|> range(start: -7d)\
|> filter(fn: (r) => r["_measurement"] == "upct-it2-engine")\
|> filter(fn: (r) => r["_field"] == "time_value_payload")\
|> map(fn: (r) => ({_value: r["_value"]}))\
|> last()',
  }).then(function (response) {
    const dataArray = response.data.split(",");
    const lastPosition = dataArray[dataArray.length - 1];
    console.log(lastPosition);
    // Dibujar el mapa de calor
    // Aquí es donde puedes poner tu propio código para generar el mapa de calor
    // Obtener el valor de lastPosition como un número
    let lastPositionValue = parseFloat(lastPosition);
    lastPositionValue = lastPositionValue / 1000;
    // Definir el color en base al valor de lastPosition
    let color;
    if (lastPositionValue < 1.4) {
      color = "green";
    } else if (lastPositionValue < 2.8) {
      color = "yellow";
    } else if (lastPositionValue < 4.5) {
      color = "orange";
    } else {
      color = "red";
    }
    console.log(lastPositionValue);
    // Dibujar el mapa de calor con el color correspondiente
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Crear una textura a partir del canvas
    const heatMapTexture = new THREE.CanvasTexture(canvas);

    // Asegúrate de que la textura se repita correctamente
    heatMapTexture.wrapS = THREE.RepeatWrapping;
    heatMapTexture.wrapT = THREE.RepeatWrapping;

    loader.load("rodamiento/Rodamiento.gltf", (gltf) => {
      rodamiento = gltf.scene;
      rodamiento.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Aquí puedes aplicar una textura diferente o hacer otras modificaciones al segundo modelo
          child.material.map = heatMapTexture;
          child.material.needsUpdate = true;
        }
      });
      rodamiento.position.set(0, 0.5, 0);
      rodamiento.scale.set(3, 3, 3);
      scene.add(rodamiento);
    });
  });
  // Agregar controlador de eventos al botón
  const toggleButton = document.getElementById("toggle-model");
  toggleButton.addEventListener("click", () => {
    if (modelVisible) {
      rodamiento.visible = false;
    } else {
      rodamiento.visible = true;
    }
    modelVisible = !modelVisible;
  });
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
