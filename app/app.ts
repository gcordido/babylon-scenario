import { Engine, Scene, FreeCamera, HemisphericLight, Vector3, MeshBuilder } from "@babylonjs/core";

export class BasicScene {
    scene: Scene;
    engine: Engine;
    
    constructor(){
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this.engine = new Engine(canvas, true);
        this.scene = this.CreateScene(canvas);

        this.engine.runRenderLoop(()=>{
            this.scene.render();
        });
    }

    CreateScene(canvas: HTMLCanvasElement): Scene{
        const scene = new Scene(this.engine);

        const camera = new FreeCamera("camera1", new Vector3(0,5,-10), scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(canvas, true);

        const light = new HemisphericLight("light", new Vector3(0,1,0), scene);
        light.intensity = 0.7;

        const sphere = MeshBuilder.CreateSphere("sphere", {diameter: 2, segments: 32}, scene);
        sphere.position.y = 1;

        const ground = MeshBuilder.CreateGround("ground", {width: 6, height:6}, scene);
        

        return scene;
    }

}

new BasicScene();
