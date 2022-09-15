import { 
    Scene, 
    Engine, 
    FreeCamera, 
    HemisphericLight, 
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Texture,
    SceneLoader,
    CubeTexture,
    PhysicsImpostor,
    CannonJSPlugin,
    ActionManager,
    ExecuteCodeAction,
    AbstractMesh,
    PredicateCondition
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { AdvancedDynamicTexture, Image} from "@babylonjs/gui";
import * as CANNON from "cannon";

/*Declares and exports the BasicScene class, which initializes both the Babylon Scene and the Babylon Engine */
export class BasicScene {
    scene: Scene;
    engine: Engine;
    camera: FreeCamera;
    ball?:AbstractMesh;
    ballIsHeld:boolean;
    
    constructor(){
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this.engine = new Engine(canvas, true);
        this.scene = this.CreateScene();
        this.camera = this.CreateController();
        this.CreateBall().then(ball => {this.ball = ball});
        this.ballIsHeld = false;

        this.engine.runRenderLoop(()=>{
            this.scene.render();
        });
    }
    /** CreateScene method
     *  - Creates the overall scene, including the following elements:
     *      > HemisphericLight
     *      > Skybox (by an imported environment texture)
     *      > Physics Engine instancing
     *      > Ready to Grab Indicator
     *  @returns Scene
     */
    CreateScene(): Scene{
        const scene = new Scene(this.engine);
        scene.actionManager = new ActionManager();

        const light = new HemisphericLight("light", new Vector3(0,1,0), scene);
        light.intensity = 0.7;

        /*Enables Physics in the Scene
            - Engine: CannonJS (test Ammo.js for better performance)
            - Allows for collisions to happen, mainly used for the camera+ground collision
        */
        scene.enablePhysics(
            new Vector3(0, -9.81, 0),
            new CannonJSPlugin(true, 100, CANNON)
        );
        scene.collisionsEnabled = true;

        //Environment Skybox, imports the city image 360 view
        const envTex = CubeTexture.CreateFromPrefilteredData(
            "./environment/sky.env",
            scene
        );
        scene.environmentTexture = envTex;
        scene.createDefaultSkybox(envTex,true);


        /*Creates the remaining components of the Scene
        - Ground Component:
        - Physic Impostors: Allows for physics interactions between different Meshes.
            These are modelled around the 3D meshes, similar to colliders.
        - Hoops: Basketball Hoop Meshes
        */
        this.CreateGround();
        this.CreateHoops();
        this.CreateImpostors();

        //Grabbing indicator
        const target = this.CreateIndicator(); 


        /*Stars the first onPointerDown instance to get into the game.
            - The first click will lock the pointer for the camera to pan around.
            - Then checks if the ball is in front of the camera, a click will grab it.
        */
        scene.onPointerDown = (evt) => {
            if(evt.button === 0) this.engine.enterPointerlock();
            if(evt.button === 1) this.engine.exitPointerlock();
            if(this.BallCheck()){
                target.isVisible = false;
                this.ballIsHeld = true;
                this.PickBall();
            }
        }
        
        /*Starts an onPointMove instance to detect the ball.
        - Showcases the target if the ball is being detected by the camera's forward ray
        - Calls the BallCheck() method
        */
        scene.onPointerMove = () => {
            //Create function for boolean value
            if(this.BallCheck() && !this.ballIsHeld){
                target.isVisible = true;
                console.log("target shows up");
            }
            else target.isVisible = false;
        }

        return scene;
    }
    /** CreateController method
     *  - Creates a FreeCamera object, with gravity and collisions enabled.
     *  - Sets up the WASD keys to control/move the camera view.
     * @returns FreeCamera
     */
    CreateController(): FreeCamera {
        const camera = new FreeCamera("camera", new Vector3(0,1,-6), this.scene);
        camera.attachControl();
        //Camera properties
        camera.applyGravity = true;
        camera.checkCollisions = true;
        camera.ellipsoid = new Vector3(0.5, 0.5, 0.5);
        camera.minZ = 1;
        camera.speed = 0.25;
        camera.angularSensibility = 3500;
        //Enables the WASD keys to control the camera movement. Each value represents the keycode for a specific key.
        camera.keysUp.push(87);
        camera.keysLeft.push(65);
        camera.keysDown.push(83);
        camera.keysRight.push(68);
    
        return camera;
    }
    /** CreateGround method
     *  - Creates a ground mesh of dimensions 15.25 by 28.65 meters.
     *  - Calls the CreateGroundMaterial method to add material to the ground mesh.
     */
    CreateGround():void {
        const ground = MeshBuilder.CreateGround(
            "ground", 
            {width:15.24, height:28.65}, 
            this.scene
            );
    
        ground.material = this.CreateGroundMaterial();
    }
    /* CreateGroundMaterial Method
     *  - Creates a Material for the ground mesh using an imported asset.
     */
    CreateGroundMaterial(): StandardMaterial {
        const groundMat = new StandardMaterial("groundMat", this.scene);
        const texArray: Texture[] = [];
        const diffuseTex = new Texture(
            "./textures/wood/kitchen_wood_diff_1k.jpg",
            this.scene);
        groundMat.diffuseTexture = diffuseTex;
        texArray.push(diffuseTex);
        texArray.forEach((tex)=>{
            tex.uScale = 4;
            tex.vScale = 4;
        });
        return groundMat;
    }
    /** CreateBall method
     *  - Imports a 3D basketball model.
     *  - Creates a physics impostor for the ball mesh
     *  - Creates an action manager so the ball can be interacted with
     * @returns Promise<AbstractMesh>
     */
    async CreateBall(): Promise<AbstractMesh>{
        const models = await SceneLoader.ImportMeshAsync(
            "",
            "./models/",
            "ball.glb"
        );
        //The Mesh is imported in an array, where the first element is the root (used for pointer/manipulation purposes, but not editing the mesh itself)
        //In order to properly work with the mesh, we select the next element which actually does represent the mesh itself.
        const ball = models.meshes[1];
        ball.position = new Vector3(0,6,1.25);
        ball.scaling.scaleInPlace(.025);
    
        ball.physicsImpostor = new PhysicsImpostor(
            ball,
            PhysicsImpostor.SphereImpostor,
            {mass: 1, restitution: 0.5, ignoreParent: true, friction: 1},
            this.scene
        );
    
        ball.actionManager = new ActionManager(this.scene);
    
        return ball;
    
    }
    /** CreateHoops method
     *  - Import a 3D Hoop Mesh, clones it and relocates them to the ends of the court.
     * @return Promise void 
     */
    async CreateHoops(): Promise<void> {
        const models = await SceneLoader.ImportMeshAsync(
        "",
        "./models/",
        "hoop.glb"
        );
        const hoop = models.meshes[0];
        const hoop2 = hoop.clone("hoop2", null, false);
        //Hoop #1 properties
        hoop.position = new Vector3(0, 0, 12);
        hoop.scaling.scaleInPlace(0.35);
        
        if(hoop2){
            //Hoop #2 properties and rotation
            hoop2.position = new Vector3(0,0,-12);
            hoop2.scaling.scaleInPlace(0.35);
            const axis = new Vector3(0,1,0);
            hoop2.rotate(axis, Math.PI);
        }
    }
    /** CreateImpostors method
     *  - Creates the necessary physics impostors: Hoops, Ground and Wall ("Limiters")
     *  - All impostors are visible by default, but as we only need them to enact physics we turn them invisible.
     *  @returns void
     */
    CreateImpostors(): void{

        const ground = MeshBuilder.CreateBox("groundImpostor", {
            width: 15.24,
            height: 2,
            depth: 28.65
        });

        ground.position.y = -1;
        ground.isVisible = false;
        ground.physicsImpostor = new PhysicsImpostor(
            ground,
            PhysicsImpostor.BoxImpostor,
            {mass:0, restitution:0.5}
        );
        ground.checkCollisions = true;

        //Wall #1
        const limiter01 = MeshBuilder.CreateBox("limiter1",
        {width:15.24,
        height: 15,
        depth:2});

        limiter01.position.z = 15.24;
        limiter01.physicsImpostor = new PhysicsImpostor(
            limiter01,
            PhysicsImpostor.BoxImpostor
        );
        limiter01.isVisible = false;
        limiter01.checkCollisions = true;
        // Wall #2
        const limiter02 = limiter01.clone();
        limiter02.position.z = -15.24;

        //Wall #3
        const limiter03 = MeshBuilder.CreateBox("limiter3",
        {width: 5,
        height: 15,
        depth: 28.65});

        limiter03.position.x = 10;
        limiter03.physicsImpostor = new PhysicsImpostor(
            limiter03,
            PhysicsImpostor.BoxImpostor
        );
        limiter03.isVisible = false;
        limiter03.checkCollisions = true;
        //Wall #4
        const limiter04 = limiter03.clone();
        limiter04.position.x = -10;

        //Hoop Board #1
        const boardLimiter = MeshBuilder.CreateBox("board1",
        {width: 3,
        height: 2,
        depth: .25});
        boardLimiter.position.z = 11.5;
        boardLimiter.position.y = 4.5;
        boardLimiter.isVisible = false;

        boardLimiter.physicsImpostor = new PhysicsImpostor(
            boardLimiter,
            PhysicsImpostor.BoxImpostor
            );
        boardLimiter.checkCollisions = true;
        //Hoop Board #2
        const boardLimiter02 = boardLimiter.clone();
        boardLimiter02.position.z = -11.5;

        //Hoop Pole #1
        const postLimiter = MeshBuilder.CreateCylinder("cylinder1", {height: 5, diameter: 0.3});
        postLimiter.position.z = 12;
        postLimiter.position.x = -0.05;
        postLimiter.position.y = 2;

        postLimiter.physicsImpostor = new PhysicsImpostor(
            postLimiter,
            PhysicsImpostor.CylinderImpostor
            );

        postLimiter.isVisible = false;
        postLimiter.checkCollisions = true;

        //Hoop Pole #2
        const postLimiter02 = postLimiter.clone();
        postLimiter02.position.z = -12;
        

        //Hoop Basket
        const hoopRing = MeshBuilder.CreateTorus("ring", {thickness: 0.05, diameter: 0.75});
        hoopRing.position.z = 10.95;
        hoopRing.position.y = 4.07;
        hoopRing.position.x = -0.05;
        hoopRing.isVisible = false;

        hoopRing.physicsImpostor = new PhysicsImpostor(
            hoopRing,
            PhysicsImpostor.MeshImpostor
        );

        const hoopRing02 = hoopRing.clone();
        hoopRing02.position.z = -10.95;
        hoopRing02.position.x = 0.04;
        
    }

    CreateIndicator(): Image{
        const target = new Image("grab", "./images/hand_fluent.png");
        target.stretch = Image.STRETCH_UNIFORM;
        target.width = "20%"
        target.height = "20%"
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("FullscreenUI");
        advancedTexture.addControl(target);
        
        return target;
    }

    /** BallCheck method
     *  - Grabs a ray in the direction the camera is facing and detects whether
     * it crosses the ball mesh. If it does, it returns a true value.
     * @returns isBallOnSight (boolean value)
     */
    BallCheck(): boolean{
        let isBallOnSight = false;
        const rayCast = this.camera.getForwardRay();
        if(this.ball){
            const ballIsSeen = (rayCast.intersectsMesh(this.ball));
            if (ballIsSeen.pickedMesh?.id === "basketball"){
                isBallOnSight = true;
            }   
        }
        return isBallOnSight;   
    }

    /** PickBall method
     *  - Sets the camera as the ball mesh's parent (attaches) and resets the ball to a visible position in front of the camera
     *  - Disposes the physics impostor to avoid collision errors
     *  - Detects if a launch key is pressed ("r"), and throws the ball forward.
     * @returns void
     */
    PickBall(): void{
        
        //shootAction: Executes the code to throw the ball if and only if the ball is currently being held.
        const shootAction = new ExecuteCodeAction(
            {
                trigger: ActionManager.OnKeyDownTrigger,
                parameter: "r"
            },
            () => {
                if(this.ball){
                    //Eliminates the ball's parent and reassigns a physics impostor to the mesh
                    this.ball.setParent(null);
                    if(this.ball?.physicsImpostor){this.ball.physicsImpostor.dispose();}
                    this.ball.physicsImpostor = new PhysicsImpostor(
                        this.ball,
                        PhysicsImpostor.SphereImpostor,
                        {mass: 1, restitution: 0.5, ignoreParent: true, friction: 1},
                        this.scene
                    );
                    //Sends the ball in the camera's facing direction. Throw not powerful enough yet, must tweak.
                    //Gets a forward vector from the camera, and adds it to an up vector.
                    const forwardVector = this.camera.getDirection(Vector3.Forward());
                    const upVector = new Vector3(0,5,0);
                    forwardVector.scaleInPlace(7);
                    console.log(this.ballIsHeld);

                    //Applies an impulse in the direction of the resulting vector from the ball's absolute position.
                    this.ball?.applyImpulse(forwardVector.add(upVector), this.ball.getAbsolutePosition());
                }
                this.ballIsHeld = false;
            },
            //Babylon condition, runs the action only if ballIsHeld is true
            new PredicateCondition(this.scene.actionManager as ActionManager, 
                () => {return this.ballIsHeld})   
        );

        if(this.ball){
            //attaches ball mesh to camera
            this.ball.physicsImpostor?.dispose();
            this.ball.physicsImpostor = null;
            this.ball.setParent(this.camera);
            this.ball.position.y = 0;
            this.ball.position.z = 3;
            
            //Add an action manager to register if a key is pressed to carry out an action after (throw ball)
            this.scene.actionManager.registerAction(shootAction)
        }
        return;
    
    }
    /**
     * Point detection function. 
     * - Detects when points have been scored (basket has been made).
     * - Determines the amount of points from player position at throwing.
     */
    PointDetection(): void{


    }

}

new BasicScene();
