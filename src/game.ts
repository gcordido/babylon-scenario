import {
    Engine,
    Scene,
    FreeCamera,
    Vector3,
    Color3
} from "@babylonjs/core"
import{
    Image, TextBlock, AdvancedDynamicTexture, Button, Rectangle
} from "@babylonjs/gui"
import "@babylonjs/loaders"
import {BasketballGame} from "./app"

enum State { START = 0, INSTRUCTION = 1, DIFFICULTY = 2, GAME = 3}

class Game {
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    private _state: number = 0;
    private _gameScene!: BasketballGame;
    private _instructionScene!: Scene;

    constructor() {
        this._canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        this.main();
    }

    private async main(): Promise<void> {
        await this.goToMainMenu();

        this._engine.runRenderLoop(() => {
            switch(this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.INSTRUCTION:
                    this._scene.render();
                    break;
                case State.DIFFICULTY:
                    this._scene.render();
                    break;
                case State.GAME:
                    //Condition based on timer to be added here.
                    break;
                default: break;
            } 
        });
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    private async goToMainMenu(){
        this._engine.displayLoadingUI();

        this._scene.detachControl();

        let scene = new Scene(this._engine);
        let camera = new FreeCamera("camera1", new Vector3(0, 5, -10),scene);
        camera.setTarget(Vector3.Zero());

        const MainMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        MainMenu.idealHeight = 1920;
        //Image link to be changed for direct asset.
        const backgroundImg = new Image("",  "https://i.imgur.com/noHjjmi.png");
        backgroundImg.stretch = Image.STRETCH_FILL;
        MainMenu.addControl(backgroundImg);

        let playButton = Button.CreateSimpleButton("playButton", "Play");
        playButton.width = 0.2;
        playButton.height = "80px";
        playButton.fontSize = 40;
        playButton.color = "#FA8320";
        playButton.background = "white";
        playButton.thickness = 4;
        playButton.cornerRadius = 20;
        playButton.shadowColor = "#FA8320";
        playButton.shadowOffsetX = 5;
        playButton.shadowOffsetY = 3;
        playButton.left = "-13%";
        playButton.top = "40%";
        MainMenu.addControl(playButton);

        playButton.onPointerUpObservable.add(() => {
            this.goToDifficulty();
            scene.detachControl();
        })

        let instButton = Button.CreateSimpleButton("instructionsButton", "Instructions");
        instButton.width = 0.2;
        instButton.height = "80px";
        instButton.fontSize = 40;
        instButton.color = "#FA8320";
        instButton.background = "white";
        instButton.thickness = 4;
        instButton.cornerRadius = 20;
        instButton.shadowColor = "#FA8320";
        instButton.shadowOffsetX = 5;
        instButton.shadowOffsetY = 3;
        instButton.left = "13%";
        instButton.top = "40%";
        MainMenu.addControl(instButton);

        instButton.onPointerUpObservable.add(() => {
            this.goToInstructions();
            scene.detachControl();
        })

        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;
    }

    private async goToDifficulty(): Promise<void> {
        this._scene.detachControl();

        let scene = new Scene(this._engine);
        let camera = new FreeCamera("camera1", new Vector3(0, 5, -10),scene);
        camera.setTarget(Vector3.Zero());

        const DifficultyMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        DifficultyMenu.idealHeight = 1920;
        //Image link to be changed for direct asset.
        const backgroundImg = new Image("",  "https://i.imgur.com/noHjjmi.png");
        backgroundImg.stretch = Image.STRETCH_FILL;
        DifficultyMenu.addControl(backgroundImg);

        const bgRectangle = new Rectangle();
        bgRectangle.top = "-40%";
        bgRectangle.cornerRadius = 20;
        bgRectangle.height = "175px";
        bgRectangle.width = "50%";
        bgRectangle.color = "White";
        bgRectangle.background = "#3f3461";
        bgRectangle.thickness = 4;
        DifficultyMenu.addControl(bgRectangle);

        const difficultyText = new TextBlock();
        difficultyText.text = "Choose your Difficulty";
        difficultyText.color = "white";
        difficultyText.fontWeight = "bold";
        difficultyText.fontSize = 120;
        difficultyText.top = "-40%";
        DifficultyMenu.addControl(difficultyText);


        let easyButton = Button.CreateSimpleButton("easyButton", "Easy");
        easyButton.width = 0.2;
        easyButton.height = "160px";
        easyButton.fontSize = 40;
        easyButton.color = "#FA8320";
        easyButton.background = "white";
        easyButton.thickness = 4;
        easyButton.cornerRadius = 20;
        easyButton.shadowColor = "#FA8320";
        easyButton.shadowOffsetX = 5;
        easyButton.shadowOffsetY = 3;
        // easyButton.left = ";
        easyButton.top = "-20%";
        DifficultyMenu.addControl(easyButton);

        easyButton.onPointerUpObservable.add(() => {
            this.goToGame("EASY");
            scene.detachControl();
        })

        let medButton = Button.CreateSimpleButton("medButton", "Medium");
        medButton.width = 0.2;
        medButton.height = "160px";
        medButton.fontSize = 40;
        medButton.color = "#FA8320";
        medButton.background = "white";
        medButton.thickness = 4;
        medButton.cornerRadius = 20;
        medButton.shadowColor = "#FA8320";
        medButton.shadowOffsetX = 5;
        medButton.shadowOffsetY = 3;
        medButton.top = "10%";
        DifficultyMenu.addControl(medButton);

        medButton.onPointerUpObservable.add(() => {
            this.goToGame("MEDIUM");
            scene.detachControl();
        })

        let hardButton = Button.CreateSimpleButton("hardButton", "Hard");
        hardButton.width = 0.2;
        hardButton.height = "160px";
        hardButton.fontSize = 40;
        hardButton.color = "#FA8320";
        hardButton.background = "white";
        hardButton.thickness = 4;
        hardButton.cornerRadius = 20;
        hardButton.shadowColor = "#FA8320";
        hardButton.shadowOffsetX = 5;
        hardButton.shadowOffsetY = 3;
        hardButton.top = "40%";
        DifficultyMenu.addControl(hardButton);

        hardButton.onPointerUpObservable.add(() => {
            this.goToGame("HARD");
            scene.detachControl();
        });

        let backButton = Button.CreateSimpleButton("backButton", "Back to Main Menu");
        backButton.width = "10%";
        backButton.height = "120px";
        backButton.fontSize = 30;
        backButton.color = "White";
        backButton.thickness = 4;
        backButton.cornerRadius = 20;
        backButton.shadowColor = "#BFABFF";
        backButton.shadowOffsetX = 5;
        backButton.shadowOffsetY = 3;
        backButton.left = "30%";
        backButton.top = "40%";
        backButton.background = "#3f3461";
        DifficultyMenu.addControl(backButton);

        backButton.onPointerUpObservable.add(() => {
            this.goToMainMenu();
            scene.detachControl();
        })


        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._scene = scene;
        this._state = State.DIFFICULTY;

    }

    private async goToGame(difficulty: string): Promise<void> {
        this._scene.detachControl();
        this._gameScene = new BasketballGame(difficulty);

        await this._gameScene.scene.whenReadyAsync();
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = this._gameScene.scene;
        this._engine.hideLoadingUI();
        this._scene.attachControl();
    }

    private async goToInstructions(): Promise<void>{
        this._scene.detachControl();

        this._instructionScene = new Scene(this._engine);
        let camera = new FreeCamera("camera1", new Vector3(0, 5, -10), this._instructionScene);
        camera.setTarget(Vector3.Zero());

        const instUI = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this._instructionScene);
        instUI.idealWidth = 1920;
        //Replace link with Image Asset.
        const backgroundImg = new Image("", "https://i.imgur.com/d6srwXE.png");
        backgroundImg.stretch = Image.STRETCH_FILL;
        instUI.addControl(backgroundImg);

        // Headings

        const howToPlayText = new TextBlock();
        howToPlayText.text = "How to Play";
        howToPlayText.color = "white";
        howToPlayText.fontWeight = "bold";
        howToPlayText.fontSize = 120;
        howToPlayText.top = "-40%";
        instUI.addControl(howToPlayText);

        const controlsHeading = new TextBlock();
        controlsHeading.text = "Controls";
        controlsHeading.color = "white";
        controlsHeading.fontWeight = "bold";
        controlsHeading.fontSize = 80;
        controlsHeading.top = "-22%";
        controlsHeading.left = "-30%";
        instUI.addControl(controlsHeading);

        const shootHeading = new TextBlock();
        shootHeading.text = "Shoot";
        shootHeading.color = "white";
        shootHeading.fontWeight = "bold";
        shootHeading.fontSize = 80;
        shootHeading.top = "-22%";
        instUI.addControl(shootHeading);

        const scoreHeading = new TextBlock();
        scoreHeading.text = "Score";
        scoreHeading.color = "white";
        scoreHeading.fontWeight = "bold";
        scoreHeading.fontSize = 80;
        scoreHeading.top = "-22%";
        scoreHeading.left = "30%";
        instUI.addControl(scoreHeading);

        //Images. LINKS TO BE REPLACED BY IMAGES IN ASSETS.

        const scoreImage = new Image("", "https://i.imgur.com/VvrGORx.png");
        scoreImage.width = "300px";
        scoreImage.height = "244px";
        scoreImage.left = "-30%";
        instUI.addControl(scoreImage);

        const shootImage = new Image("", "https://i.imgur.com/ukqeVcn.png");
        shootImage.width = "300px";
        shootImage.height = "244px";
        shootImage.top = ".05%";
        instUI.addControl(shootImage);

        const controlsImage = new Image("", "https://i.imgur.com/KrYMsTQ.png");
        controlsImage.width = "300px";
        controlsImage.height = "244px";
        controlsImage.left = "30%";
        instUI.addControl(controlsImage);

        const controlsInstructions = new TextBlock();
        controlsInstructions.text = "Press the WASD keys to move the player.\n Use your mouse to look around and aim.";
        controlsInstructions.color = "white";
        controlsInstructions.fontSize = 30;
        controlsInstructions.top = "22%";
        controlsInstructions.left = "-30%";
        instUI.addControl(controlsInstructions);

        const shootInstructions = new TextBlock();
        shootInstructions.text = "Press the SPACE BAR to shoot the ball.\n Hold the SPACE BAR for a power boost!";
        shootInstructions.color = "white";
        shootInstructions.fontSize = 30;
        shootInstructions.top = "22%";
        instUI.addControl(shootInstructions);

        const scoreInstructions = new TextBlock();
        scoreInstructions.text = "Score 2 points for each shot.\n Score 3 points for shooting from\n the 3 point line.";
        scoreInstructions.color = "white";
        scoreInstructions.fontSize = 30;
        scoreInstructions.top = "22%";
        scoreInstructions.left = "30%";
        instUI.addControl(scoreInstructions);

        // Buttons

        const buttonMain = Button.CreateSimpleButton("mainButton", "Main");
        buttonMain.width = 0.2;
        buttonMain.height = "80px";
        buttonMain.fontSize = 40;
        buttonMain.color = "#FA8320";
        buttonMain.background = "white";
        buttonMain.thickness = 4;
        buttonMain.cornerRadius = 20;
        buttonMain.shadowColor = "#FA8320";
        buttonMain.shadowOffsetX = 5;
        buttonMain.shadowOffsetY = 3;
        buttonMain.left = "-13%";
        buttonMain.top = "40%";
        instUI.addControl(buttonMain);

        buttonMain.onPointerUpObservable.add(() =>{
            this.goToMainMenu();
        });

        const playButton = Button.CreateSimpleButton("playButton", "Play");
        playButton.width = 0.2;
        playButton.height = "80px";
        playButton.fontSize = 40;
        playButton.color = "#FA8320";
        playButton.background = "white";
        playButton.thickness = 4;
        playButton.cornerRadius = 20;
        playButton.shadowColor = "#FA8320";
        playButton.shadowOffsetX = 5;
        playButton.shadowOffsetY = 3;
        playButton.left = "13%";
        playButton.top = "40%";
        instUI.addControl(playButton);

        playButton.onPointerUpObservable.add(() => {
            this.goToDifficulty();
        })

        await this._instructionScene.whenReadyAsync();
        this._scene.dispose();
        this._state = State.INSTRUCTION;
        this._scene = this._instructionScene;


    }

}

new Game();


