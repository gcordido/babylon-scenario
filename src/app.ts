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
    PredicateCondition,
    setAndStartTimer,
    KeyboardEventTypes
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { AdvancedDynamicTexture, Image, StackPanel, TextBlock, Control, Rectangle, Button } from "@babylonjs/gui";
import * as CANNON from "cannon";

// session timer
enum Difficulty {
    EASY = 90,
    MEDIUM = 60,
    HARD = 30
}

/*Declares and exports the BasicScene class, which initializes both the Babylon Scene and the Babylon Engine */
export class BasketballGame {
    scene: Scene;
    engine: Engine;
    player: FreeCamera;
    ball?:AbstractMesh;
    ballIsHeld:boolean;
    points: number;
    pointCount: TextBlock;
    shootPoint: boolean;
    gameOver: boolean;
    isPaused: boolean;
    return: boolean;
    MAX_DISTANCE_TO_GRAB: number;
    private _difficulty : {[index: string]: number} = {
        "EASY": 90,
        "MEDIUM": 60,
        "HARD": 30
    }
    private _advancedTexture: AdvancedDynamicTexture;
    // timer
    public time: number = 0;

    constructor(choice: string){
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this.engine = new Engine(canvas, true);
        this.scene = this.CreateScene();
        this.player = this.CreateController();
        this.CreateTimer(this._difficulty[choice]); // TODO: passing a difficulty param

        this.CreateBall().then(ball => {this.ball = ball});
        this.gameOver = false;
        this.ballIsHeld = false;
        this.points = 0;
        this.pointCount = new TextBlock();
        this.shootPoint = false;
        this.MAX_DISTANCE_TO_GRAB = 4;
        this.isPaused = false;
        this.return = false;

        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("FullscreenUI");
        this._advancedTexture = advancedTexture;

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
        //this.CreateGround();
        this.CreateCourt();
        this.CreateHoops();
        this.CreateImpostors();

        //Grabbing indicator
        const target = this.CreateIndicator(); 
        const aimPoint = this.CreatePointer();
        let screenUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        screenUI.addControl(target);
        screenUI.addControl(aimPoint);

        const pointContainer = this.CreateContainer("100%", "96px", "#FA8320", 4, "#3f3461")
        pointContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        pointContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

        //Creates UI element for points
        let pointCount = new TextBlock();
        pointCount.name = "points count";
        //pointCount.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
        pointCount.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        pointCount.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        pointCount.fontSize = "48px";
        pointCount.color = "white";
        pointCount.text = "Points: 0";
        pointCount.top = "32px";
        pointCount.left = "64px";
        pointCount.width = "25%";
        pointCount.fontFamily = "Helvetica";
        pointCount.paddingRight = "50px";
        pointCount.top = "20px";
        pointCount.resizeToFit = true;
        //Adds Points elements to the screen UI
        screenUI.addControl(pointContainer);
        screenUI.addControl(pointCount);

        let unpauseButton = this.CreateButton("unpauseButton", "Resume", 0.2, "160px", "white", "#3f3461");
        unpauseButton.fontSize = 40;
        unpauseButton.shadowColor = "#BFABFF";

        let goBackButton = this.CreateButton("goBackButton", "Back To Main Menu", 0.2, "160px", "white", "#3f3461");
        goBackButton.fontSize = 40;
        goBackButton.shadowColor = "BFABFF";
        goBackButton.onPointerDownObservable.add(() =>{
            this.scene.detachControl();
            this.return = true;
        })

        /*Stars the first onPointerDown instance to get into the game.
            - The first click will lock the pointer for the camera to pan around.
            - Then checks if the ball is in front of the camera, a click will grab it.
        */
        this.engine.enterPointerlock();

        document.onkeydown = (evt) => {
            if(evt.keyCode == 27 && !this.gameOver){
                this.engine.exitPointerlock();
                screenUI.addControl(unpauseButton);
                this.isPaused = true;

                unpauseButton.onPointerDownObservable.add(()=>{
                    this.isPaused = false;
                    this.engine.enterPointerlock();
                    screenUI.removeControl(unpauseButton);
                })

            }
        }

        scene.onPointerDown = (evt) => {
            // if(evt.button === 1) this.engine.exitPointerlock();
            if(this.BallCheck()){
                target.isVisible = false;
                this.ballIsHeld = true;
                this.shootPoint = false;
                this.PickBall();
                this.PointDetection();
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
            }
            else target.isVisible = false;
        }

        //Game Loop to update points
        scene.onBeforeRenderObservable.add(() => {
            pointCount = this.updatePoints(pointCount);
            this.pointCount = pointCount;
            if(this.gameOver === true){
                this.engine.exitPointerlock();
                screenUI.addControl(goBackButton);
            }
        })


        return scene;
    }
    /** CreateController method
     *  - Creates a FreeCamera object, with gravity and collisions enabled.
     *  - Sets up the WASD keys to control/move the camera view.
     * @returns FreeCamera
     */
    CreateController(): FreeCamera {
        const camera = new FreeCamera("camera", new Vector3(0,2,-6), this.scene);
        camera.attachControl();
        //Camera properties
        camera.applyGravity = true;
        camera.checkCollisions = true;
        camera.ellipsoid = new Vector3(0.5, 1, 0.5);
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
        ground.position.y = 0.5;
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
    
        // ball.actionManager = new ActionManager(this.scene);
    
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
        "basketball-hoop.glb"
        );
        const hoop = models.meshes[0];
        const hoop2 = hoop.clone("hoop2", null, false);
        //Hoop #1 properties
        hoop.position = new Vector3(0, 0,3.25);
        hoop.scaling.scaleInPlace(3);
        let axis = new Vector3(0,1,0);
        hoop.rotate(axis, (Math.PI / 2));

        
        if(hoop2){
            //Hoop #2 properties and rotation
            hoop2.position = new Vector3(0,0, -3.25);
            hoop2.scaling.scaleInPlace(3);
            const axis = new Vector3(0,1,0);
            hoop2.rotate(axis, (-(Math.PI / 2)));
        }
    }

    async CreateCourt(): Promise<void> {
        const models = await SceneLoader.ImportMeshAsync(
        "",
        "./models/",
        "city.glb"
        );
        const city = models.meshes[0];
        city.position = new Vector3(0,0,0);
        city.scaling.scaleInPlace(4);
        let axis = new Vector3(0,1,0);
        city.rotate(axis, (Math.PI / 2));
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

        ground.position.y = -0.9;
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
        {width: 2.5,
        height: 1.75,
        depth: .12});
        boardLimiter.position.z = 11.65;
        boardLimiter.position.y = 5.35;
        boardLimiter.position.x = -0.125;
        boardLimiter.isVisible = false;

        boardLimiter.physicsImpostor = new PhysicsImpostor(
            boardLimiter,
            PhysicsImpostor.BoxImpostor
            );
        boardLimiter.checkCollisions = true;
        //Hoop Board #2
        const boardLimiter02 = boardLimiter.clone();
        boardLimiter02.position.z = -11.65;
        boardLimiter02.position.x = 0.125

        //Hoop Pole #1
        const postLimiter = MeshBuilder.CreateCylinder("cylinder1", {height: 6.5, diameter: 0.3});
        postLimiter.position.z = 13.25;
        postLimiter.position.x = -0.05;
        postLimiter.position.y = 2;
        postLimiter.isVisible = false;

        postLimiter.physicsImpostor = new PhysicsImpostor(
            postLimiter,
            PhysicsImpostor.CylinderImpostor
            );

        //postLimiter.isVisible = false;
        postLimiter.checkCollisions = true;

        //Hoop Pole #2
        const postLimiter02 = postLimiter.clone();
        postLimiter02.position.z = -13.25;
        postLimiter02.position.x = 0.05;
        

        //Hoop Basket
        const hoopRing = MeshBuilder.CreateTorus("ring", {thickness: 0.05, diameter: 0.75});
        hoopRing.position.z = 11.14;
        hoopRing.position.y = 4.84;
        hoopRing.position.x = -0.08;
        hoopRing.isVisible = false;

        hoopRing.physicsImpostor = new PhysicsImpostor(
            hoopRing,
            PhysicsImpostor.MeshImpostor
        );

        const hoopRing02 = hoopRing.clone();
        hoopRing02.position.z = -11.14;
        hoopRing02.position.x = 0.08;
        
    }

    CreateIndicator(): Image{
        const target = new Image("grab", "./images/hand_fluent.png");
        target.stretch = Image.STRETCH_UNIFORM;
        target.width = "20%"
        target.height = "20%"

        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("FullscreenUI");
        advancedTexture.addControl(target);
        this._advancedTexture = advancedTexture;

        
        return target;
    }

    /** BallCheck method
     *  - Grabs a ray in the direction the camera is facing and detects whether
     * it crosses the ball mesh. If it does, it returns a true value.
     * @returns isBallOnSight (boolean value)
     */
    BallCheck(): boolean{
        let isBallOnSight = false;
        const rayCast = this.player.getForwardRay();
        if(this.ball && this.player){
            let distance = Vector3.Distance(this.ball.absolutePosition, this.player.globalPosition);

            const ballIsSeen = (rayCast.intersectsMesh(this.ball));
            if (ballIsSeen.pickedMesh?.id === "basketball" && distance < this.MAX_DISTANCE_TO_GRAB){
                isBallOnSight = true;
            }   
        }
        return isBallOnSight;   
    }
    // ---- Timer -----
    CreateTimer(difficulty: number): void {
        console.log("difficulty: " + difficulty);
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("FullscreenUI");
        
        const timerUi = new TextBlock();
        timerUi.name = "timer";
        timerUi.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_RIGHT;
        timerUi.paddingRight = "50px";
        timerUi.top = "20px";
        timerUi.fontSize = "48px";
        timerUi.color = "white";
        timerUi.resizeToFit = true;
        timerUi.height = "96px";
        timerUi.width = "220px";

        // set timer text
        timerUi.text = "Time: " + this.getFormattedTime(difficulty);
        
        timerUi.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        timerUi.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        
        // stackPanel.addControl(timerUi);
        advancedTexture.addControl(timerUi);
        this._advancedTexture = advancedTexture;

        let count = difficulty;
        setInterval(() => {
            if(!this.isPaused){
                count--;
                timerUi.text = this.getFormattedTime(count);
                if (count <= 0) {
                    timerUi.text = "Time is up!";
                    this.gameOver = true;
                    return;
                }
            }
        }, 1000);
    }

    // 90 sec => "1:30"
    getFormattedTime(seconds: number) : string {
        const minutes: number = Math.floor(seconds / 60) % 60;
        const newSeconds: number = Math.floor(seconds) % 60;
        return minutes.toString() + ":" + ( "00" + newSeconds ).slice( -2 );
    }

    /** PickBall method
     *  - Sets the camera as the ball mesh's parent (attaches) and resets the ball to a visible position in front of the camera
     *  - Disposes the physics impostor to avoid collision errors
     *  - Detects if a launch key is pressed (spacebar), and throws the ball forward.

     * @returns void
     */
    PickBall(): void{
        
        if(this.ball){
            //attaches ball mesh to camera
            this.ball.physicsImpostor?.dispose();
            this.ball.physicsImpostor = null;
            this.ball.setParent(this.player);
            this.ball.position.y = 0;
            this.ball.position.z = 2.5;
            this.ball.position.x = 0;
            
            this.ThrowBall();

        }
        return;
    }

    ThrowBall(): void {

        let count = 0;
        let t = 0;;

        //shootAction: Executes the code to throw the ball if and only if the ball is currently being held.
        const shootAction = new ExecuteCodeAction(
            {
                trigger: ActionManager.OnKeyUpTrigger,
                parameter: " "
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
                    const forwardVector = this.player.getDirection(Vector3.Forward());
                    const upVector = new Vector3(0,5,0);
                    forwardVector.scaleInPlace(t);
                    //console.log(this.ballIsHeld);

                    //Applies an impulse in the direction of the resulting vector from the ball's absolute position.
                    this.ball?.applyImpulse(forwardVector.add(upVector), this.ball.getAbsolutePosition());
                }
                this.ballIsHeld = false;
            },
            //Babylon condition, runs the action only if ballIsHeld is true
            new PredicateCondition(this.scene.actionManager as ActionManager, 
                () => {return this.ballIsHeld})   
        );

        let power = new TextBlock();

        let advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        let powerBar = this.CreatePowerBar();
        powerBar.left = "-30%";
        powerBar.top = "25%";
        powerBar.cornerRadius = 40;
        let insideBar = new Rectangle();
        insideBar.parent = powerBar;
        insideBar.cornerRadius = 40;
        advancedTexture.addControl(insideBar);
        advancedTexture.addControl(powerBar);
        powerBar.isVisible = false;


        //Keyboard Event Observable for when shooting key is pressed. Starts power gauge until key is released
        this.scene.onKeyboardObservable.add((kbInfo) => {
            switch(kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    if(kbInfo.event.key === " " && count < 60 && this.ballIsHeld) {
                        powerBar.isVisible = true;
                        count += 1;
                        let width = count * 5;

                        insideBar.width = width + "px";
                        insideBar.height = "38px";
                        insideBar.background = "green";
                        insideBar.color = "green";
                        insideBar.thickness = 4;
                        // power.text = count.toString();

                        //Placement for visual
                        insideBar.left = "-30%";
                        insideBar.top = "25%";

                    }
                    break;
                case KeyboardEventTypes.KEYUP:
                    if(kbInfo.event.key === " "){
                        console.log("throw finished");
                        count = count / 30;
                        //Throwing Value (t) is determined as f(count) = 2^(2count). Used as a scalar in the vector function to throw.
                        t = Math.pow(2, (count * 2));
                        this.scene.actionManager.registerAction(shootAction);
                        count = 0;
                        advancedTexture.removeControl(insideBar);
                        powerBar.isVisible = false;
                    }
                    break;
            }
        })
        

    }
    /**
     * Point detection function. 
     * - Detects when points have been scored (basket has been made).
     * - Determines the amount of points from player position at throwing.
     */
    PointDetection(): void{
        const pointCollider = MeshBuilder.CreateSphere("pointCollider", {diameter: 0.08});
        pointCollider.isVisible = false;
        const pointSphere = MeshBuilder.CreateSphere("pointsHere", {diameter: 0.08});
        pointSphere.position.z = 11.13;
        pointSphere.position.y = 4.83;
        pointSphere.position.x = -0.08;
        pointSphere.isVisible = false;

        const pointSphere2 = pointSphere.clone();
        pointSphere2.position.z = -11.13;
        pointSphere2.position.x = 0.08;

        //TEST: Testing intersection via Action Trigger
        const pointDetection = new ExecuteCodeAction(
            {
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: {
                    mesh: pointSphere
                }
            },
            (evt) => {
                console.log("point detected");
                //Checks if the ball's trajectory is valid. (Points don't count if the ball is shot from below the ring)
                if(this.ball){
                    const linearVelocity = this.ball.physicsImpostor?.getLinearVelocity();
                    if(linearVelocity && linearVelocity.y < 0) {
                        this.points += 2;
                        //Ensures that points are not counted more than once.
                        this.shootPoint = true;
                    }
                } 

            },
            //Condition to check that points were not already counted.
            //Fixes a bug where the intersection event is triggered repeatedly.
            new PredicateCondition(this.scene.actionManager as ActionManager, 
                () => {return !this.shootPoint && !this.isPaused}) 
        );

        const pointDetection_2 = new ExecuteCodeAction(
            {
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: {
                    mesh: pointSphere2
                }
            },
            (evt) => {
                console.log("point detected");
                //Checks if the ball's trajectory is valid. (Points don't count if the ball is shot from below the ring)
                if(this.ball){
                    const linearVelocity = this.ball.physicsImpostor?.getLinearVelocity();
                    if(linearVelocity && linearVelocity.y < 0) {
                        this.points += 2;
                        //Ensures that points are not counted more than once.
                        this.shootPoint = true;
                    }
                } 

            },
            //Condition to check that points were not already counted.
            //Fixes a bug where the intersection event is triggered repeatedly.
            new PredicateCondition(this.scene.actionManager as ActionManager, 
                () => {return !this.shootPoint && !this.isPaused}) 
        );
        
        pointCollider.actionManager = new ActionManager(this.scene);
        pointCollider.actionManager.registerAction(pointDetection);
        pointCollider.actionManager.registerAction(pointDetection_2);

        if(this.ball) pointCollider.parent = this.ball;
    }
    //Updates the points text block
    updatePoints(pointCount: TextBlock): TextBlock{
        pointCount.text = "Points: " + this.points;
        return pointCount;
    }

    CreatePointer(): TextBlock{
        let target = new TextBlock();
        target.fontSize = 100;
        target.color = "white";
        target.text = "○";
        
        return target;
    }

    CreatePowerBar(): Rectangle{
        let bar = new Rectangle();
        bar.width = "300px";
        bar.height = "40px";
        bar.color = "black";
        bar.thickness = 4;

        return bar;
    }

    CreateContainer(width: string, height: string, color: string, thickness: number, bgColor: string): Rectangle{

        let container = new Rectangle();
        container.width = width;
        container.height = height;
        container.color = color;
        container.thickness = thickness;
        container.background = bgColor;
        container.cornerRadius = 20;

        return container;
    }

    CreateButton(name: string, text: string, width: number, height: string, color: string, bgColor: string): Button{

        let button = Button.CreateSimpleButton(name, text);
        button.width = width;
        button.height = height;
        button.color = color;
        button.background = bgColor;
        button.cornerRadius = 20;
        button.shadowOffsetX = 5;
        button.shadowOffsetY = 3;
        
        return button;

    }

}
