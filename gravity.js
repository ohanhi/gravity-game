function Gravity() {

  var SKETCH_OPTIONS = {
    partCount: 10,
    partMassFactor: 20,
    gravitationalConstant: 6.0,
    vertexCount: 500
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
    COORD_MAX = 0;

    var traveled = 0;

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
      return P.color(hue,100,100, 100);
    };

    const velocityToColor = function(v) {
      var vc = v*1.5 + 60;
      var hue = parseInt(vc%100, 10);
      return P.color(hue,100,80, 100);
    }

    /* List for drawable path vertices */
    var pathVertices = [];

    function Part(x, y, vx, vy, m, isMoving) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.m = m;
      this.radius = massToRadius(this.m);
      this.highlightPath = false;
      this.isMoving = isMoving;
      this.traveled = 0;
    }
    Part.prototype.move = function() {
      if (this.isMoving) {
        var oldX = this.x,
          oldY = this.y;
        this.x += this.vx * TIME_STEP;
        this.y += this.vy * TIME_STEP;

        this.traveled += P.dist(oldX, oldY, this.x, this.y);
        traveled = this.traveled;

        if (this.highlightPath && P.frameCount%5 == 0) {
          pathVertices.push([this.x, this.y, P.dist(0,0, this.vx,this.vy)]);
        }
      }
    };
    Part.prototype.draw = function(biggestMass) {
      if (this.isMoving) {
        P.fill(100,0,100);
        P.ellipse(this.x, this.y, 5, 5);
      } else {
        var color = massToColor(this.m, biggestMass);
        P.fill(color);
        P.ellipse(this.x, this.y, this.radius*2, this.radius*2);
      }
    };
    Part.prototype.collide = function(part) {
      this.isMoving = false;
      part.isMoving = false;

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

      part.vx = 0;
      part.vy = 0;
    };
    /*
    Determines the force from each part of the system and
    updates the velocities accordingly.
    */
    Part.prototype.updateVelocity = function(parts) {
      var self = this, ax = 0, ay = 0;
      parts.forEach(function(part, index){
        // remove parts too far from the center
        if (part.x > CANVAS.width + COORD_MAX
          || part.x < 0 - COORD_MAX
          || part.y > CANVAS.height + COORD_MAX
          || part.y < 0 - COORD_MAX) {
          // Outside the universe!
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
      return this.parts.length-1;
    };
    PartSystem.prototype.update = function(draw) {
      var self = this;

      if (draw && draw === true) {
        P.fill(90);
        P.text(P.round(traveled), 20, CANVAS.height - 40);

        P.noFill();
        P.noStroke();
        P.beginShape();
        pathVertices.forEach(function(vertex){
          var color = velocityToColor(vertex[2]);
          P.fill(color);
          P.ellipse(vertex[0], vertex[1], 4, 4);
        });
        P.endShape();
        P.noStroke();

        if (pathVertices.length > SKETCH_OPTIONS.vertexCount) {
          pathVertices.splice(0,1);
        }
      }

      self.parts.forEach(function(part, index){
        // Update the position and speed of the part
        if (part.isMoving) {
          part.updateVelocity(self.parts);
        }
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
        P.background(0,0,10, 100);
        this.update(true);
      }
    };
    PartSystem.prototype.setHighlighted = function(i) {
      pathVertices = [];
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
          (Math.random()*100 + 3) * SKETCH_OPTIONS.partMassFactor
        );
        this.add(part);
      }
    };
    PartSystem.prototype.createProtoDisk = function(n) {
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
          (Math.random()*30 + 3) * SKETCH_OPTIONS.partMassFactor
        );
        this.add(part);
      }
    };
    PartSystem.prototype.launchProbe = function(x, y, x2, y2) {
      var dx = x2-x,
        dy = y2-y,
        v = P.dist(x,y, x2,y2) * 0.05,
        a = P.atan2(dy, dx) + P.TWO_PI,
        vy = v * P.sin(a),
        vx = v * P.cos(a);

      var probe = new Part(
        x, y,
        vx, vy,
        0.01,
        true
      );
      var idx = this.add(probe);
      ps.setHighlighted(idx);
    };
    // END DEFINITIONS


    var ps = new PartSystem();
    ps.createProtoDisk(SKETCH_OPTIONS.partCount, 0);

    P.setup = function() {
      P.size(CANVAS.width, CANVAS.height);
      P.ellipseMode(P.CENTER);
      P.colorMode(P.HSB, 100);
      P.noStroke();
      P.textSize(24);
    };

    var startX, startY;

    // Override draw function, by default it will be called 60 times per second
    P.draw = function() {
      ps.redraw();

      if (startX && startY) {
        P.stroke(100);
        P.fill(100)
        P.strokeWeight(2);
        P.line(startX, startY, P.mouseX, P.mouseY);
        P.ellipse(startX, startY, 4, 4);
        P.noStroke();
      }
    };

    document.onkeydown = function(evt) {
      // spacebar
      if (evt.keyCode == 32) {
        evt.preventDefault();
        ps.paused = !ps.paused;
      }
    };

    document.onmousedown = function(evt) {
      startX = evt.x;
      startY = evt.y;
    }
    document.onmouseup = function(evt) {
      if (startX && startY) {
        ps.launchProbe(startX, startY, evt.x, evt.y);
      }
      startX = null;
      startY = null;
    }
  }

  var canvas = document.getElementById("processing-canvas");
  // attaching the sketchProc function to the canvas,
  var processing = new Processing(canvas, sketchProc);

  var restart = function() {
    processing.exit();
    processing = new Processing(canvas, sketchProc);
  };

}
