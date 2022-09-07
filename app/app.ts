import { Engine, Scene, FreeCamera, HemisphericLight, Vector3, MeshBuilder } from "babylonjs";

export class BasicScene {
    scene: Scene;
    engine: Engine;
    
    constructor(){
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this.engine = new Engine(canvas, true);
        this.scene = this.CreateScene();

        this.engine.runRenderLoop(()=>{
            this.scene.render();
        });
    }

    CreateScene(): Scene{
        const scene = new Scene(this.engine);

        const camera = new FreeCamera("camera1", new Vector3(0,1,0), scene);

        const light = new HemisphericLight("light", new Vector3(0,1,0), scene);

        const sphere = MeshBuilder.CreateSphere("sphere", {diameter: 2, segments: 32}, scene);

        const ground = MeshBuilder.CreateGround("ground", {width: 6, height:6}, scene);

        return scene;
    }

}