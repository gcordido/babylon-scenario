import { Engine, Scene } from "babylonjs";

class BasicScene {
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

        return scene;
    }

}