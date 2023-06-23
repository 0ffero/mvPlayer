let DEBUG = class {
    constructor() {
        let scene = this.scene = vars.getScene();
        let cC = this.cC = consts.canvas;
        
        let c = this.container = scene.add.container().setName('DEBUGContainer').setDepth(consts.depths.DEBUG);

        this.enemies = vars.App.enemies;
        this.level = vars.App.level;
        this.player = vars.App.player1;
        let msg = '';
        let font = vars.UI.fonts.debug;
        this.message = scene.add.text(cC.width-10,10, msg, font).setOrigin(1,0);
        c.add(this.message);
    }

    update() {
        if (!this.player) return false;
        // Player vars
        let msg = `Game started: ${this.player.gameStarted?'TRUE':'FALSE'}\nP1 Alive: ${this.player.alive?'TRUE':'FALSE'}\nP1 Moving: ${!this.player.moving?'FALSE':this.player.moving.toUpperCase().padStart(5,' ')}\nP1 Shooting: ${this.player.shooting?'TRUE':'FALSE'}\nP1 Immune: ${this.player.immune?'TRUE':'FALSE'}`;

        let pointer = this.player.getPointerXY();
        msg +=`\nPointer: ${pointer.x|0},${pointer.y|0}`;

        // Level vars
        if (this.level && this.level.pointerCurrentlyOver) {
            msg+=`\nOver: ${this.level.pointerCurrentlyOver.name}`;
        };

        if (this.enemies) {
            if (this.enemies.pointerCurrentlyOver) {
                msg+=`\nOver (E): ${this.enemies.pointerCurrentlyOver.name}`;
            }
            msg+=`\nAlive: ${this.enemies.enemyCountTotal}`;
        };

        this.message.setText(msg);
    }
};