function Gravity() {

  var SKETCH_OPTIONS = {
    centerMass: 100000,
    partCount: 1000,
    partMassFactor: 0.2,
    gravitationalConstant: 1.0
  };

  var restartWithInputValues = function(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    function floatVal(id) {
      return parseFloat(document.getElementById(id).value, 10);
    }
    SKETCH_OPTIONS.centerMass = floatVal('centerMass');
    SKETCH_OPTIONS.partCount = parseInt(floatVal('partCount'));
    SKETCH_OPTIONS.partMassFactor = floatVal('partMassFactor');
    SKETCH_OPTIONS.gravitationalConstant = floatVal('gravitationalConstant');

    document.getElementById('dialog').className = "closed";
    restart();
  };

  document.getElementById('start').onclick = restartWithInputValues;
  document.getElementById('params').onsubmit = restartWithInputValues;

  document.getElementById('dialogOpen').onclick = function(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    var dialog = document.getElementById('dialog');
    if (dialog.className === "open") {
      dialog.className = "closed";
    } else {
      dialog.className = "open";
    }
  };

  function sketchProc(P) {

    // BEGIN DEFINITIONS
    const CANVAS = {
      width: window.innerWidth,
      height: window.innerHeight
    },
    TIME_STEP = 0.1,
    COLLISION_CONSTANT = 2.0,
    CLICK_RADIUS = 10.0,
    COORD_MAX = 2000;

    /**
    Newton's universal gravitation function.

    @link http://en.wikipedia.org/wiki/Newton's_law_of_universal_gravitation

    @param m1 mass of part 1
    @param m2 mass of part 2
    @param r distance between center of masses
    */
    const gravitation = function(m1, m2, r) {
      return SKETCH_OPTIONS.gravitationalConstant * (m1*m2 / (r*r));
    };
    /**
    Utility function that returns -1 or 1 at 50% probability.
    */
    const randomPlusMinus = function() {
      return (Math.random() < 0.5) ? -1 : 1;
    };
    /**
    Converts mass to displayed size.
    */
    const massToRadius = function(m) {
      return Math.log(m);
    };
    /**
    Converts mass to displayed color.
    */
    const colorC = 10/SKETCH_OPTIONS.partMassFactor;
    const massToColor = function(m, biggestMass) {
      if (!biggestMass) {
        biggestMass = m;
      }
      var hue = parseInt((P.atan(m/biggestMass)*colorC*60+10)%100, 10);
      return P.color(hue,100,100, 80);
    };

    /* List for drawable path vertices */
    var drawPath = [];

    function Part(x, y, vx, vy, m) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.m = m;
      this.radius = massToRadius(this.m);
      this.highlightPath = false;
    }
    Part.prototype.move = function() {
      this.x += this.vx * TIME_STEP;
      this.y += this.vy * TIME_STEP;

      if (this.highlightPath && P.frameCount%4 === 0) {
        drawPath.push([this.x, this.y]);
      }
    };
    Part.prototype.draw = function(biggestMass) {
      color = massToColor(this.m, biggestMass);
      P.fill(color);
      if (this.highlightPath) {
        P.strokeWeight(1);
        P.stroke(0,0,90);
      }
      P.ellipse(this.x, this.y, this.radius*2, this.radius*2);
      if (this.highlightPath) {
        P.noStroke();
      }
    };
    Part.prototype.checkClick = function(x, y) {
      var dx = this.x - x,
        dy = this.y - y,
        result = Math.sqrt(dx*dx + dy*dy) < (this.radius + CLICK_RADIUS);
      return result;
    };
    Part.prototype.collide = function(part) {
      // smaller particle always moves, not the larger
      if (part.m > this.m) {
        this.x = part.x;
        this.y = part.y;
      }

      // totally inelastic collision
      this.vx = (this.m*this.vx + part.m*part.vx) / (this.m + part.m);
      this.vy = (this.m*this.vy + part.m*part.vy) / (this.m + part.m);
      this.m += part.m;
      part.m = 0;
      this.radius = massToRadius(this.m);
      part.radius = massToRadius(part.m);

      // highlight this part, if (part) was highlighted
      if (part.highlightPath === true) {
        this.highlightPath = true;
      }
    };
    /*
    Determines the force from each part of the system and
    updates the velocities accordingly.
    */
    Part.prototype.updateVelocity = function(parts) {
      var self = this, ax = 0, ay = 0;
      parts.forEach(function(part, index){
        // remove parts too far from the center
        if (P.abs(part.x) > COORD_MAX || P.abs(part.y) > COORD_MAX) {
          parts.splice(index, 1);
          return;
        }

        // distance of particles
        var dx = self.x-part.x,
        dy = self.y-part.y,
        r = Math.sqrt(dx*dx + dy*dy);

        // collision detection
        if (r && r < self.radius + part.radius + 2*COLLISION_CONSTANT) {
          self.collide(part);
          parts.splice(index, 1);
          return;
        }

        // gravitational force
        var f = gravitation(self.m, part.m, r);

        ax = (r===0)? 0 : (f * (dx/r)) / self.m;
        ay = (r===0)? 0 : (f * (dy/r)) / self.m;
        self.vx += ax * TIME_STEP * -1;
        self.vy += ay * TIME_STEP * -1;
      });
    };

    function PartSystem() {
      this.parts = [];
      this.biggestMass = 0.0;
      this.paused = false;
    }
    PartSystem.prototype.destroy = function() {
      this.parts = undefined;
    };
    PartSystem.prototype.add = function(part) {
      this.parts.push(part);
    };
    PartSystem.prototype.addCentralPart = function() {
      var part = new Part(
        CANVAS.width/2, CANVAS.height/2,
        0, 0,
        SKETCH_OPTIONS.centerMass
      );
      this.parts.push(part);
    };
    PartSystem.prototype.update = function(draw) {
      var self = this;

      if (draw && draw === true) {
        P.fill(0);
        P.rect(0, CANVAS.height - 60, 0, CANVAS.height - 40);
        P.fill(90);
        P.text(self.parts.length, 20, CANVAS.height - 40);

        P.noFill();
        P.strokeWeight(1);
        P.stroke(0,0,100, 60);
        P.beginShape();
        drawPath.forEach(function(vertex){
          P.curveVertex(vertex[0], vertex[1]);
        });
        P.endShape();
        P.noStroke();

        if (drawPath.length > 1000) {
          drawPath.splice(0,1);
        }
      }

      self.parts.forEach(function(part, index){
        // Update the position and speed of the part
        part.updateVelocity(self.parts);
        part.move();

        // Draw the part, if requested
        if (draw && draw === true) {
          part.draw(self.biggestMass);
        }

        // Update biggestMass, used for visualizing parts
        if (part.m > self.biggestMass) {
          self.biggestMass = part.m;
        }
      });
    };
    PartSystem.prototype.redraw = function() {
      if (this.paused) {
        P.fill(90);
        P.text("PAUSE", CANVAS.width*0.5, CANVAS.height*0.5);
      } else {
        P.fill(0,0,0, 40);
        P.rect(0,0,CANVAS.width,CANVAS.height);
        this.update(true);
      }
    };
    PartSystem.prototype.setHighlighted = function(i) {
      drawPath = [];
      this.parts.forEach(function(part){
        part.highlightPath = false;
      });
      if (i > 0 && i < this.parts.length) this.parts[i].highlightPath = true;
    };
    PartSystem.prototype.randomizeParts = function(n, startVelocity) {
      for(var i = 0; i < n; i++) {
        var vx = startVelocity ? Math.random()*10*randomPlusMinus() : 0,
          vy = startVelocity ? Math.random()*10*randomPlusMinus() : 0;
        var part = new Part(
          Math.random()*CANVAS.width, Math.random()*CANVAS.height,
          vx, vy,
          (Math.random()*10 + 3) * SKETCH_OPTIONS.partMassFactor
        );
        this.add(part);
      }
    };
    PartSystem.prototype.createProtoDisk = function(n) {
      this.addCentralPart();

      var canvasMin = (CANVAS.width < CANVAS.height) ? CANVAS.width : CANVAS.height,
        gaussianFactor = canvasMin * 0.15;
        cx = CANVAS.width * 0.5,
        cy = CANVAS.height * 0.5;

      for (var i = 0; i < n; i++) {
        var x, y, vx, vy, d, a, v;

        // Get Gaussian random position
        x = P.randomGaussian() * gaussianFactor;
        y = P.randomGaussian() * gaussianFactor;
        d = P.dist(x,y, 0,0);

        // Calculate angle, randomize start velocity along tangent
        a = P.atan2(y, x) + P.PI,
        v = Math.random()*8 + 2;

        vx = v * P.sin(a);
        vy = -1 * v * P.cos(a);

        // Move to canvas centre
        x += cx;
        y += cy;

        var part = new Part(
          x, y,
          vx, vy,
          (Math.random()*10 + 3) * SKETCH_OPTIONS.partMassFactor
        );
        this.add(part);
      }
    };
    PartSystem.prototype.handleClick = function(x, y) {
      for (var i = 0; i < this.parts.length; i++) {
        if (this.parts[i].checkClick(x, y) === true) {
          ps.setHighlighted(i);
          return;
        }
      }
      ps.setHighlighted(-1);
    };
    // END DEFINITIONS


    var ps = new PartSystem();
    ps.createProtoDisk(SKETCH_OPTIONS.partCount);

    P.setup = function() {
      P.size(CANVAS.width, CANVAS.height);
      P.ellipseMode(P.CENTER);
      P.colorMode(P.HSB, 100);
      P.noStroke();
      P.textSize(24);
    };

    // Override draw function, by default it will be called 60 times per second
    P.draw = function() {
      ps.redraw();
    };

    document.onkeydown = function(evt) {
      // spacebar
      if (evt.keyCode == 32) {
        evt.preventDefault();
        ps.paused = !ps.paused;
      }
    };

    document.onmousedown = function(evt) {
      ps.handleClick(evt.x, evt.y);
    }
  }

  var canvas = document.getElementById("processing-canvas");
  // attaching the sketchProc function to the canvas,
  // exit immediately to wait for user input
  var processing = new Processing(canvas, sketchProc);
  processing.exit();

  var restart = function() {
    processing.exit();
    processing = new Processing(canvas, sketchProc);
  };

}
