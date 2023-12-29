class Player {
    static getConfig(base) {
        return {
            level: $('input[name="level"]').val(),
            race: $('select[name="race"]').val(),
            aqbooks: $('select[name="aqbooks"]').val() == "Yes",
            reactionmin: parseInt($('input[name="reactionmin"]').val()),
            reactionmax: parseInt($('input[name="reactionmax"]').val()),
            adjacent: parseInt($('input[name="adjacent"]').val()),
            target: {
                level: parseInt($('input[name="targetlevel"]').val()),
                basearmor: parseInt($('input[name="targetarmor"]').val()),
                armor: parseInt($('input[name="targetarmor"]').val()),
                defense: parseInt($('input[name="targetlevel"]').val()) * 5,
                mitigation: 1 - 15 * (parseInt($('input[name="targetresistance"]').val()) / 6000),
                binaryresist: parseInt(10000 - (8300 * (1 - (parseInt($('input[name="targetresistance"]').val()) * 0.15 / 60)))),
                speed: parseFloat($('input[name="targetspeed"]').val()) * 1000,
                mindmg: parseInt($('input[name="targetmindmg"]').val()),
                maxdmg: parseInt($('input[name="targetmaxdmg"]').val()),
            },
        };
    }
    constructor(testItem, testType, enchtype, config) {
        if (!config) config = Player.getConfig();
        this.rage = 0;
        this.ragemod = 1;
        this.level = config.level;
        this.rageconversion = ((0.0091107836 * this.level * this.level) + 3.225598133 * this.level) + 4.2652911;
        if (this.level == 25) this.rageconversion = 82.25;
        this.agipercrit = this.getAgiPerCrit(this.level);
        this.timer = 0;
        this.itemtimer = 0;
        this.dodgetimer = 0;
        this.extraattacks = 0;
        this.batchedextras = 0;
        this.nextswinghs = false;
        this.nextswingcl = false;
        this.race = config.race;
        this.aqbooks = config.aqbooks;
        this.reactionmin = config.reactionmin;
        this.reactionmax = config.reactionmax;
        this.adjacent = config.adjacent;
        this.spelldamage = 0;
        this.target = config.target;
        this.base = {
            ap: 0,
            agi: 0,
            str: 0,
            hit: 0,
            crit: 0,
            spellcrit: 0,
            skill_0: this.level * 5,
            skill_1: this.level * 5,
            skill_2: this.level * 5,
            skill_3: this.level * 5,
            skill_4: this.level * 5,
            skill_5: this.level * 5,
            skill_6: this.level * 5,
            skill_7: (this.level < 35 ? 225 : 300),
            haste: 1,
            strmod: 1,
            agimod: 1,
            dmgmod: 1,
            apmod: 1,
            baseapmod: 1,
            resist: {
                shadow: 0,
                arcane: 0,
                nature: 0,
                fire: 0,
                frost: 0,
            },
        };
        if (enchtype == 1) {
            this.testEnch = testItem;
            this.testEnchType = testType;
        }
        else if (enchtype == 2) {
            this.testTempEnch = testItem;
            this.testTempEnchType = testType;
        }
        else if (enchtype == 3) {
            if (testType == 0) {
                this.base.ap += testItem;
            }
            else if (testType == 1) {
                this.base.crit += testItem;
            }
            else if (testType == 2) {
                this.base.hit += testItem;
            }
            else if (testType == 3) {
                this.base.str += testItem;
            }
            else if (testType == 4) {
                this.base.agi += testItem;
            }
        }
        else {
            this.testItem = testItem;
            this.testItemType = testType;
        }
        this.stats = {};
        this.auras = {};
        this.spells = {};
        this.items = [];
        this.addRace();
        this.addTalents();
        this.addGear();
        if (!this.mh) return;
        this.addSets();
        this.addEnchants();
        this.addTempEnchants();
        this.addBuffs();
        this.addSpells();
        this.addRunes();
        if (this.talents.flurry) this.auras.flurry = new Flurry(this);
        if (this.talents.deepwounds) this.auras.deepwounds = globalThis.runes ? new DeepWounds(this) : new OldDeepWounds(this);
        if (this.adjacent && this.talents.deepwounds) {
            for (let i = 2; i <= (this.adjacent + 1); i++)
                this.auras['deepwounds' + i] = globalThis.runes ? new DeepWounds(this, null, i) : new OldDeepWounds(this, null, i);
        }
        if (this.spells.overpower) this.auras.battlestance = new BattleStance(this);
        if (this.spells.bloodrage) this.auras.bloodrage = new BloodrageAura(this);
        if (this.spells.berserkerrage) this.auras.berserkerrage = new BerserkerRageAura(this);
        if (this.items.includes(9449)) this.auras.pummeler = new Pummeler(this);
        if (this.items.includes(14554)) this.auras.cloudkeeper = new Cloudkeeper(this);
        if (this.items.includes(20130)) this.auras.flask = new Flask(this);
        if (this.items.includes(23041)) this.auras.slayer = new Slayer(this);
        if (this.items.includes(22954)) this.auras.spider = new Spider(this);
        if (this.items.includes(23570)) this.auras.gabbar = new Gabbar(this);
        if (this.items.includes(21180)) this.auras.earthstrike = new Earthstrike(this);
        if (this.items.includes(21670)) this.auras.swarmguard = new Swarmguard(this);
        if (this.items.includes(19949)) this.auras.zandalarian = new Zandalarian(this);
        if (this.items.includes(211423)) this.auras.voidmadness = new VoidMadness(this);
        if (this.defstance && this.spells.sunderarmor && this.devastate && !this.oh && !this.mh.twohand) {
            this.spells.sunderarmor.devastate = true;
            this.spells.sunderarmor.nocrit = false;
        }

        this.update();
        if (this.oh)
            this.oh.timer = Math.round(this.oh.speed * 1000 / this.stats.haste / 2);
    }
    addRace() {
        for(let l of levelstats) {
            let raceid;
            if (this.race == "Human") raceid = "1";
            if (this.race == "Orc") raceid = "2";
            if (this.race == "Dwarf") raceid = "3";
            if (this.race == "Night Elf") raceid = "4";
            if (this.race == "Undead") raceid = "5";
            if (this.race == "Tauren") raceid = "6";
            if (this.race == "Gnome") raceid = "7";
            if (this.race == "Troll") raceid = "8";

            // race,class,level,str,agi,sta,inte,spi
            let stats = l.split(",");
            if (stats[0] == raceid && stats[2] == this.level) {
                this.base.aprace = (this.level * 3) - 20;
                this.base.ap += (this.level * 3) - 20;
                this.base.str += parseInt(stats[3]);
                this.base.agi += parseInt(stats[4]);
                this.base.skill_0 += raceid == "1" ? 5 : 0;
                this.base.skill_1 += raceid == "1" ? 5 : 0;
                this.base.skill_2 += 0;
                this.base.skill_3 += raceid == "2" ? 5 : 0;
            }
        }
    }
    addTalents() {
        this.talents = {};
        for (let tree in talents) {
            for (let talent of talents[tree].t) {
                this.talents = Object.assign(this.talents, talent.aura(talent.c));
            }
        }
    }
    addGear() {
        for (let type in gear) {
            for (let item of gear[type]) {
                if ((this.testItemType == type && this.testItem == item.id) ||
                    (this.testItemType != type && item.selected)) {
                    for (let prop in this.base) {
                        if (prop == 'haste') {
                            this.base.haste *= (1 + item.haste / 100) || 1;
                        } else {
                            if (typeof item[prop] === 'object') {
                                for (let subprop in item[prop]) {
                                    this.base[prop][subprop] += item[prop][subprop] || 0;
                                }
                            } else {
                                if (item[prop]) {
                                    this.base[prop] += item[prop] || 0;
                                }
                            }
                        }
                    }
                    if (item.skill && item.skill > 0) {
                        if (item.type == 'Varied') {
                            this.base['skill_1'] += item.skill;
                            this.base['skill_2'] += item.skill;
                            this.base['skill_3'] += item.skill;
                        }
                        else {
                            let sk = WEAPONTYPE[item.type.replace(' ','').toUpperCase()];
                            this.base['skill_' + sk] += item.skill;
                        }
                    }

                    if (type == "mainhand" || type == "offhand" || type == "twohand")
                        this.addWeapon(item, type);


                    if (item.proc && item.proc.chance && (type == "trinket1" || type == "trinket2")) {
                        let proc = {};
                        proc.chance = item.proc.chance * 100;
                        proc.extra = item.proc.extra;
                        proc.magicdmg = item.proc.dmg;
                        if (item.spell) {
                            this.auras[item.proc.spell.toLowerCase()] = eval('new ' + item.proc.spell + '(this)');
                            proc.spell = this.auras[item.proc.spell.toLowerCase()];
                        }
                        this["trinketproc" + (this.trinketproc1 ? 2 : 1)] = proc;
                    }
                    else if (item.proc && item.proc.chance) {
                        this.attackproc = {};
                        this.attackproc.chance = item.proc.chance * 100;
                        this.attackproc.magicdmg = item.proc.dmg;
                    }

                    this.items.push(item.id);
                }
            }
        }

        if (this.mh && this.mh.twohand) {
            for (let type in gear) {
                for (let item of gear[type]) {
                    if (type != "hands" && type != "head") continue;
                    if ((this.testItemType == type && this.testItem == item.id) ||
                        (this.testItemType != type && item.selected)) {
                        if (item.skill && item.skill > 0) {
                            if (item.type == 'Varied') {
                                this.base['skill_1'] -= item.skill;
                                this.base['skill_2'] -= item.skill;
                                this.base['skill_3'] -= item.skill;
                            }
                            else {
                                let sk = WEAPONTYPE[item.type.replace(' ','').toUpperCase()];
                                this.base['skill_' + sk] -= item.skill;
                            }
                        }
                    }
                }
            }
        }
    }
    addWeapon(item, type) {

        let ench, tempench;
        for (let item of enchant[type]) {
            if (item.temp) continue;
            if (this.testEnchType == type && this.testEnch == item.id) ench = item;
            else if (this.testEnchType != type && item.selected) ench = item;
        }
        for (let item of enchant[type]) {
            if (!item.temp) continue;
            if (this.testTempEnchType == type && this.testTempEnch == item.id) tempench = item;
            else if (this.testTempEnchType != type && item.selected) tempench = item;
        }

        if (type == "mainhand")
            this.mh = new Weapon(this, item, ench, tempench, false, false);

        if (type == "offhand" && item.type != "Shield")
            this.oh = new Weapon(this, item, ench, tempench, true, false);

        if (type == "twohand")
            this.mh = new Weapon(this, item, ench, tempench, false, true);

    }
    addEnchants() {
        for (let type in enchant) {
            for (let item of enchant[type]) {
                if (item.temp) continue;
                if ((this.testEnchType == type && this.testEnch == item.id) ||
                    (this.testEnchType != type && item.selected)) {

                    for (let prop in this.base) {
                        if (prop == 'haste') {
                            this.base.haste *= (1 + item.haste / 100) || 1;
                        } else {
                            if (typeof item[prop] === 'object') {
                                for (let subprop in item[prop]) {
                                    this.base[prop][subprop] += item[prop][subprop] || 0;
                                }
                            } else {
                                if (item[prop]) {
                                    this.base[prop] += item[prop] || 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    addTempEnchants() {
        for (let type in enchant) {
            for (let item of enchant[type]) {
                if (!item.temp) continue;
                if ((type == "mainhand" || type == "twohand") && this.mh.windfury) continue;
                if ((this.testTempEnchType == type && this.testTempEnch == item.id) ||
                    (this.testTempEnchType != type && item.selected)) {

                    for (let prop in this.base) {
                        if (prop == 'haste') {
                            this.base.haste *= (1 + item.haste / 100) || 1;
                        } else {
                            if (typeof item[prop] === 'object') {
                                for (let subprop in item[prop]) {
                                    this.base[prop][subprop] += item[prop][subprop] || 0;
                                }
                            } else {
                                if (item[prop]) {
                                    this.base[prop] += item[prop] || 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    addRunes() {
        if (typeof runes === "undefined") return;
        for (let type in runes) {
            for (let item of runes[type]) {
                if (item.selected) {
                    // Blood Frenzy
                    if (item.bleedrage) {
                        this.bleedrage = item.bleedrage;
                    }
                    // Endless Rage
                    if (item.ragemod) {
                        this.ragemod = item.ragemod;
                    }
                    // Frenzied Assault
                    if (item.haste2h && this.mh.twohand) {
                        this.base.haste *= (1 + item.haste2h / 100) || 1;
                    }
                    // Flagellation
                    if (item.flagellation && (this.spells.bloodrage || this.spells.berserkerrage)) {
                        this.auras[item.name.toLowerCase()] = eval(`new ${item.name}(this)`);
                    }
                    // Single-Minded Fury
                    if (item.dmgdw && this.oh) {
                        this.base.dmgmod *= (1 + item.dmgdw / 100) || 1;
                    }
                    // Devastate
                    if (item.devastate) {
                        this.devastate = item.devastate;
                    }
                }
            }
        }
    }
    addSets() {
        for (let set of sets) {
            let counter = 0;
            for (let item of set.items)
                if (this.items.includes(item))
                    counter++;
            if (counter == 0)
                continue;
            for (let bonus of set.bonus) {
                if (counter >= bonus.count) {
                    for (let prop in bonus.stats)
                        this.base[prop] += bonus.stats[prop] || 0;
                    if (bonus.stats.procspell) {
                        this.attackproc = {};
                        this.attackproc.chance = bonus.stats.procchance * 100;
                        this.auras[bonus.stats.procspell.toLowerCase()] = eval('new ' + bonus.stats.procspell + '(this)');
                        this.attackproc.spell = this.auras[bonus.stats.procspell.toLowerCase()];
                    }
                    if (bonus.stats.enhancedbs) {
                        this.enhancedbs = true;
                    }
                }
            }
        }
    }
    addBuffs() {
        for (let buff of buffs) {
            if (buff.active) {
                let ap = 0, str = 0, agi = 0;
                if (buff.group == "battleshout") {
                    let lvlbonus = 0;
                    if (buff.lvlmod) lvlbonus = ~~((this.level - buff.minlevel + 1) * buff.lvlmod);
                    ap = ~~((buff.ap + lvlbonus + (this.enhancedbs ? 30 : 0)) * (1 + this.talents.impbattleshout));
                }
                if (buff.name == "Blessing of Might") {
                    let impmight = buffs.filter(s => s.mightmod && s.active)[0];
                    ap = ~~(buff.ap * (impmight ? impmight.mightmod : 1));
                }
                if (buff.name == "Mark of the Wild") {
                    let impmotw = buffs.filter(s => s.motwmod && s.active)[0];
                    str = ~~(buff.str * (impmotw ? impmotw.motwmod : 1));
                    agi = ~~(buff.agi * (impmotw ? impmotw.motwmod : 1));
                }
                if (buff.group == "stance")
                    this.stance = true;
                if (buff.group == "vaelbuff")
                    this.vaelbuff = true;
                if (buff.group == "dragonbreath")
                    this.dragonbreath = true;
                if (buff.id == 413479)
                    this.gladstance = true;
                if (buff.id == 71)
                    this.defstance = true;
                if (buff.bleedmod)
                    this.bleedmod = buff.bleedmod;

                this.base.ap += ap || buff.ap || 0;
                this.base.agi += agi || buff.agi || 0;
                this.base.str += str || buff.str || 0;
                this.base.crit += buff.crit || 0;
                this.base.hit += buff.hit || 0;
                this.base.spellcrit += buff.spellcrit || 0;
                this.base.agimod *= (1 + buff.agimod / 100) || 1;
                this.base.strmod *= (1 + buff.strmod / 100) || 1;
                this.base.dmgmod *= (1 + buff.dmgmod / 100) || 1;
                this.base.haste *= (1 + buff.haste / 100) || 1;
                this.base.skill_7 += buff.skill_7 || 0;
            }
        }
    }
    addSpells() {
        for (let spell of spells) {
            if (spell.active) {
                if (!spell.aura && this.mh.type == WEAPONTYPE.FISHINGPOLE) continue; 
                if (spell.aura) this.auras[spell.classname.toLowerCase()] = eval(`new ${spell.classname}(this, ${spell.id})`);
                else this.spells[spell.classname.toLowerCase()] = eval(`new ${spell.classname}(this, ${spell.id})`);
            }
        }
    }
    reset(rage) {
        this.rage = rage;
        this.timer = 0;
        this.itemtimer = 0;
        this.dodgetimer = 0;
        this.spelldelay = 0;
        this.heroicdelay = 0;
        this.mh.timer = 0;
        if (this.oh)
            this.oh.timer = Math.round(this.oh.speed * 1000 / this.stats.haste / 2);
        this.extraattacks = 0;
        this.batchedextras = 0;
        this.nextswinghs = false;
        this.nextswingcl = false;
        for (let s in this.spells) {
            this.spells[s].timer = 0;
            this.spells[s].stacks = 0;
        }
        for (let s in this.auras) {
            this.auras[s].timer = 0;
            this.auras[s].firstuse = true;
            this.auras[s].stacks = 0;
        }
        if (this.auras.deepwounds) {
            this.auras.deepwounds.idmg = 0;
        }
        if (this.auras.deepwounds2) {
            this.auras.deepwounds2.idmg = 0;
        }
        if (this.auras.deepwounds3) {
            this.auras.deepwounds3.idmg = 0;
        }
        if (this.auras.deepwounds4) {
            this.auras.deepwounds4.idmg = 0;
        }
        if (this.auras.rend) {
            this.auras.rend.idmg = 0;
        }
        if (this.auras.weaponbleedmh) {
            this.auras.weaponbleedmh.idmg = 0;
        }
        if (this.auras.weaponbleedoh) {
            this.auras.weaponbleedoh.idmg = 0;
        }
        this.update();
    }
    update() {
        this.updateAuras();
        this.updateArmorReduction();
        this.mh.glanceChance = this.getGlanceChance(this.mh);
        this.mh.miss = this.getMissChance(this.mh);
        this.mh.dwmiss = this.mh.miss;
        this.mh.dodge = this.getDodgeChance(this.mh);

        if (this.oh) {
            this.mh.dwmiss = this.getDWMissChance(this.mh);
            this.oh.glanceChance = this.getGlanceChance(this.oh);
            this.oh.miss = this.getMissChance(this.oh);
            this.oh.dwmiss = this.getDWMissChance(this.oh);
            this.oh.dodge = this.getDodgeChance(this.oh);
        }
    }
    updateAuras() {
        for (let prop in this.base)
            this.stats[prop] = this.base[prop];
        for (let name in this.auras) {
            if (this.auras[name].timer) {
                for (let prop in this.auras[name].stats)
                    this.stats[prop] += this.auras[name].stats[prop];
                for (let prop in this.auras[name].mult_stats)
                    this.stats[prop] *= (1 + this.auras[name].mult_stats[prop] / 100);
            }
        }
        this.stats.str = ~~(this.stats.str * this.stats.strmod);
        this.stats.agi = ~~(this.stats.agi * this.stats.agimod);
        this.stats.ap += this.stats.str * 2;
        this.stats.crit += this.stats.agi * this.agipercrit;
        this.crit = this.getCritChance();

        if (this.stats.baseapmod != 1)
            this.stats.ap += ~~((this.base.aprace + this.stats.str * 2) * (this.stats.baseapmod - 1));
        this.stats.ap = ~~(this.stats.ap * this.stats.apmod);
    }
    getAgiPerCrit(level) {
        let table = [0.2500, 0.2381, 0.2381, 0.2273, 0.2174, 0.2083, 0.2083, 0.2000, 0.1923, 0.1923,0.1852, 0.1786, 0.1667, 0.1613, 0.1563, 0.1515, 0.1471, 0.1389, 0.1351, 0.1282,0.1282, 0.1250, 0.1190, 0.1163, 0.1111, 0.1087, 0.1064, 0.1020, 0.1000, 0.0962,0.0943, 0.0926, 0.0893, 0.0877, 0.0847, 0.0833, 0.0820, 0.0794, 0.0781, 0.0758,0.0735, 0.0725, 0.0704, 0.0694, 0.0676, 0.0667, 0.0649, 0.0633, 0.0625, 0.0610,0.0595, 0.0588, 0.0575, 0.0562, 0.0549, 0.0543, 0.0532, 0.0521, 0.0510, 0.0500];
        return table[parseInt(level) - 1];
    }
    updateStrength() {
        this.stats.str = this.base.str;
        this.stats.ap = this.base.ap;
        this.stats.apmod = this.base.apmod;
        this.stats.baseapmod = this.base.baseapmod;

        for (let name in this.auras) {
            if (this.auras[name].timer) {
                if (this.auras[name].stats.str)
                    this.stats.str += this.auras[name].stats.str;
                if (this.auras[name].stats.ap)
                    this.stats.ap += this.auras[name].stats.ap;
                if (this.auras[name].mult_stats.apmod)
                    this.stats.apmod *= (1 + this.auras[name].mult_stats.apmod / 100);
                if (this.auras[name].mult_stats.baseapmod)
                    this.stats.baseapmod *= (1 + this.auras[name].mult_stats.baseapmod / 100);
            }
        }
        this.stats.str = ~~(this.stats.str * this.stats.strmod);
        this.stats.ap += this.stats.str * 2;

        if (this.stats.baseapmod != 1)
            this.stats.ap += ~~((this.base.aprace + this.stats.str * 2) * (this.stats.baseapmod - 1));
        this.stats.ap = ~~(this.stats.ap * this.stats.apmod);
    }
    updateAP() {
        this.stats.ap = this.base.ap;
        this.stats.apmod = this.base.apmod;
        this.stats.baseapmod = this.base.apmod;
        for (let name in this.auras) {
            if (this.auras[name].timer && this.auras[name].stats.ap) {
                this.stats.ap += this.auras[name].stats.ap;
            }
            if (this.auras[name].timer && this.auras[name].mult_stats.apmod) {
                this.stats.apmod *= (1 + this.auras[name].mult_stats.apmod / 100);
            }
            if (this.auras[name].timer && this.auras[name].mult_stats.baseapmod) {
                this.stats.baseapmod *= (1 + this.auras[name].mult_stats.baseapmod / 100);
            }
        }
        this.stats.ap += this.stats.str * 2;

        if (this.stats.baseapmod != 1)
            this.stats.ap += ~~((this.base.aprace + this.stats.str * 2) * (this.stats.baseapmod - 1));
        this.stats.ap = ~~(this.stats.ap * this.stats.apmod);
    }
    updateHaste() {
        this.stats.haste = this.base.haste;
        if (this.auras.flurry && this.auras.flurry.timer)
            this.stats.haste *= (1 + this.auras.flurry.mult_stats.haste / 100);
        if (this.auras.berserking && this.auras.berserking.timer)
            this.stats.haste *= (1 + this.auras.berserking.mult_stats.haste / 100);
        if (this.auras.empyrean && this.auras.empyrean.timer)
            this.stats.haste *= (1 + this.auras.empyrean.mult_stats.haste / 100);
        if (this.auras.eskhandar && this.auras.eskhandar.timer)
            this.stats.haste *= (1 + this.auras.eskhandar.mult_stats.haste / 100);
        if (this.auras.pummeler && this.auras.pummeler.timer)
            this.stats.haste *= (1 + this.auras.pummeler.mult_stats.haste / 100);
        if (this.auras.spider && this.auras.spider.timer)
            this.stats.haste *= (1 + this.auras.spider.mult_stats.haste / 100);
        if (this.auras.voidmadness && this.auras.voidmadness.timer)
            this.stats.haste *= (1 + this.auras.voidmadness.mult_stats.haste / 100);
        if (this.auras.jackhammer && this.auras.jackhammer.timer)
            this.stats.haste *= (1 + this.auras.jackhammer.mult_stats.haste / 100);
        if (this.auras.ragehammer && this.auras.ragehammer.timer)
            this.stats.haste *= (1 + this.auras.ragehammer.mult_stats.haste / 100);
    }
    updateBonusDmg() {
        let bonus = 0;
        if (this.auras.stoneslayer && this.auras.stoneslayer.timer)
            bonus += this.auras.stoneslayer.stats.bonusdmg;
        if (this.auras.zeal && this.auras.zeal.timer)
            bonus += this.auras.zeal.stats.bonusdmg;
        if (this.auras.zandalarian && this.auras.zandalarian.timer)
            bonus += this.auras.zandalarian.stats.bonusdmg;
        this.mh.bonusdmg = this.mh.basebonusdmg + bonus;
        if (this.oh)
            this.oh.bonusdmg = this.oh.basebonusdmg + bonus;
    }
    updateArmorReduction() {
        this.target.armor = this.target.basearmor;
        if (this.auras.annihilator && this.auras.annihilator.timer)
            this.target.armor = Math.max(this.target.armor - (this.auras.annihilator.stacks * this.auras.annihilator.armor), 0);
        if (this.auras.rivenspike && this.auras.rivenspike.timer)
            this.target.armor = Math.max(this.target.armor - (this.auras.rivenspike.stacks * this.auras.rivenspike.armor), 0);
        if (this.auras.vibroblade && this.auras.vibroblade.timer)
            this.target.armor = Math.max(this.target.armor - this.auras.vibroblade.armor, 0);
        if (this.auras.cleavearmor && this.auras.cleavearmor.timer)
            this.target.armor = Math.max(this.target.armor - this.auras.cleavearmor.armor, 0);
        if (this.auras.bonereaver && this.auras.bonereaver.timer)
            this.target.armor = Math.max(this.target.armor - (this.auras.bonereaver.stacks * this.auras.bonereaver.armor), 0);
        if (this.auras.swarmguard && this.auras.swarmguard.timer)
            this.target.armor = Math.max(this.target.armor - (this.auras.swarmguard.stacks * this.auras.swarmguard.armor), 0);
        this.armorReduction = this.getArmorReduction();
    }
    updateDmgMod() {
        this.stats.dmgmod = this.base.dmgmod;
        for (let name in this.auras) {
            if (this.auras[name].timer && this.auras[name].mult_stats.dmgmod)
                this.stats.dmgmod *= (1 + this.auras[name].mult_stats.dmgmod / 100);
        }
    }
    getGlanceReduction(weapon) {
        let diff = this.target.defense - this.stats['skill_' + weapon.type];
        let low = Math.max(Math.min(1.3 - 0.05 * diff, 0.91), 0.01);
        let high = Math.max(Math.min(1.2 - 0.03 * diff, 0.99), 0.2);
        return Math.random() * (high - low) + low;
    }
    getGlanceChance(weapon) {
        return 10 + Math.max(this.target.defense - Math.min(this.level * 5, this.stats['skill_' + weapon.type]), 0) * 2;
    }
    getMissChance(weapon) {
        let diff = this.target.defense - this.stats['skill_' + weapon.type];
        let miss = 5 + (diff > 10 ? diff * 0.2 : diff * 0.1);
        miss -= (diff > 10 ? this.stats.hit - 1 : this.stats.hit);
        return miss;
    }
    getDWMissChance(weapon) {
        let diff = this.target.defense - this.stats['skill_' + weapon.type];
        let miss = 5 + (diff > 10 ? diff * 0.2 : diff * 0.1);
        miss = miss * 0.8 + 20;
        miss -= (diff > 10 ? this.stats.hit - 1 : this.stats.hit);
        return miss;
    }
    getCritChance() {
        let crit = this.stats.crit + (this.talents.crit || 0) + (this.level - this.target.level) * 1 + (this.level - this.target.level) * 0.6;
        return Math.max(crit, 0);
    }
    getDodgeChance(weapon) {
        return Math.max(5 + (this.target.defense - this.stats['skill_' + weapon.type]) * 0.1, 0);
    }
    getArmorReduction() {
        let r = this.target.armor / (this.target.armor + 400 + 85 * this.level);
        return r > 0.75 ? 0.75 : r;
    }
    addRage(dmg, result, weapon, spell) {
        let oldRage = this.rage;
        if (!spell || spell instanceof HeroicStrike || spell instanceof Cleave) {
            if (result != RESULT.MISS && result != RESULT.DODGE && this.talents.umbridledwrath && rng10k() < this.talents.umbridledwrath * 100) {
                this.rage += 1;
            }
        }
        if (spell) {
            if (spell instanceof Execute) spell.result = result;
            if (result == RESULT.MISS || result == RESULT.DODGE) {
                this.rage += spell.refund ? spell.cost * 0.8 : 0;
                oldRage += (spell.cost || 0) + (spell.usedrage || 0); // prevent cbr proccing on refunds
            }
        }
        else {
            if (result == RESULT.DODGE) {
                this.rage += (weapon.avgdmg() / this.rageconversion) * 7.5 * 0.75;
            }
            else if (result != RESULT.MISS) {
                this.rage += (dmg / this.rageconversion) * 7.5 * this.ragemod;
            }
        }
        if (this.rage > 100) this.rage = 100;

        if (this.auras.consumedrage && oldRage < 80 && this.rage >= 80)
            this.auras.consumedrage.use();
    }
    steptimer(a) {
        if (this.timer <= a) {
            this.timer = 0;
            /* start-log */ if (log) this.log('Global CD off'); /* end-log */
            return true;
        }
        else {
            this.timer -= a;
            return false;
        }
    }
    stepitemtimer(a) {
        if (this.itemtimer <= a) {
            this.itemtimer = 0;
            /* start-log */ if (log) this.log('Item CD off'); /* end-log */
            return true;
        }
        else {
            this.itemtimer -= a;
            return false;
        }
    }
    stepdodgetimer(a) {
        if (this.dodgetimer <= a) {
            this.dodgetimer = 0;
        }
        else {
            this.dodgetimer -= a;
        }
    }
    stepauras() {

        if (this.mh.proc1 && this.mh.proc1.spell && this.mh.proc1.spell.timer) this.mh.proc1.spell.step();
        if (this.mh.proc2 && this.mh.proc2.spell && this.mh.proc2.spell.timer) this.mh.proc2.spell.step();
        if (this.oh && this.oh.proc1 && this.oh.proc1.spell && this.oh.proc1.spell.timer) this.oh.proc1.spell.step();
        if (this.oh && this.oh.proc2 && this.oh.proc2.spell && this.oh.proc2.spell.timer) this.oh.proc2.spell.step();

        if (this.auras.mightyragepotion && this.auras.mightyragepotion.firstuse && this.auras.mightyragepotion.timer) this.auras.mightyragepotion.step();
        if (this.auras.recklessness && this.auras.recklessness.firstuse && this.auras.recklessness.timer) this.auras.recklessness.step();
        if (this.auras.deathwish && this.auras.deathwish.firstuse && this.auras.deathwish.timer) this.auras.deathwish.step();
        if (this.auras.cloudkeeper && this.auras.cloudkeeper.firstuse && this.auras.cloudkeeper.timer) this.auras.cloudkeeper.step();
        if (this.auras.voidmadness && this.auras.voidmadness.firstuse && this.auras.voidmadness.timer) this.auras.voidmadness.step();
        if (this.auras.flask && this.auras.flask.firstuse && this.auras.flask.timer) this.auras.flask.step();
        if (this.auras.battlestance && this.auras.battlestance.timer) this.auras.battlestance.step();
        if (this.auras.bloodfury && this.auras.bloodfury.firstuse && this.auras.bloodfury.timer) this.auras.bloodfury.step();
        if (this.auras.berserking && this.auras.berserking.firstuse && this.auras.berserking.timer) this.auras.berserking.step();
        if (this.auras.slayer && this.auras.slayer.firstuse && this.auras.slayer.timer) this.auras.slayer.step();
        if (this.auras.spider && this.auras.spider.firstuse && this.auras.spider.timer) this.auras.spider.step();
        if (this.auras.earthstrike && this.auras.earthstrike.firstuse && this.auras.earthstrike.timer) this.auras.earthstrike.step();
        if (this.auras.pummeler && this.auras.pummeler.firstuse && this.auras.pummeler.timer) this.auras.pummeler.step();
        if (this.auras.swarmguard && this.auras.swarmguard.firstuse && this.auras.swarmguard.timer) this.auras.swarmguard.step();
        if (this.auras.zandalarian && this.auras.zandalarian.firstuse && this.auras.zandalarian.timer) this.auras.zandalarian.step();

        if (this.mh.windfury && this.mh.windfury.timer) this.mh.windfury.step();
        if (this.trinketproc1 && this.trinketproc1.spell && this.trinketproc1.spell.timer) this.trinketproc1.spell.step();
        if (this.trinketproc2 && this.trinketproc2.spell && this.trinketproc2.spell.timer) this.trinketproc2.spell.step();
        if (this.attackproc && this.attackproc.spell && this.attackproc.spell.timer) this.attackproc.spell.step();

        if (this.auras.deepwounds && this.auras.deepwounds.timer) this.auras.deepwounds.step();
        if (this.auras.rend && this.auras.rend.timer) this.auras.rend.step();
        if (this.auras.flagellation && this.auras.flagellation.timer) this.auras.flagellation.step();
        if (this.auras.berserkerrage && this.auras.berserkerrage.timer) this.auras.berserkerrage.step();
        if (this.auras.consumedrage && this.auras.consumedrage.timer) this.auras.consumedrage.step();
        if (this.auras.weaponbleedmh && this.auras.weaponbleedmh.timer) this.auras.weaponbleedmh.step();
        if (this.auras.weaponbleedoh && this.auras.weaponbleedoh.timer) this.auras.weaponbleedoh.step();

        if (this.adjacent) {
            if (this.auras.deepwounds2 && this.auras.deepwounds2.timer) this.auras.deepwounds2.step();
            if (this.auras.deepwounds3 && this.auras.deepwounds3.timer) this.auras.deepwounds3.step();
            if (this.auras.deepwounds4 && this.auras.deepwounds4.timer) this.auras.deepwounds4.step();
        }
    }
    endauras() {

        if (this.mh.proc1 && this.mh.proc1.spell && this.mh.proc1.spell.timer) this.mh.proc1.spell.end();
        if (this.mh.proc2 && this.mh.proc2.spell && this.mh.proc2.spell.timer) this.mh.proc2.spell.end();
        if (this.oh && this.oh.proc1 && this.oh.proc1.spell && this.oh.proc1.spell.timer) this.oh.proc1.spell.end();
        if (this.oh && this.oh.proc2 && this.oh.proc2.spell && this.oh.proc2.spell.timer) this.oh.proc2.spell.end();

        if (this.auras.mightyragepotion && this.auras.mightyragepotion.firstuse && this.auras.mightyragepotion.timer) this.auras.mightyragepotion.end();
        if (this.auras.recklessness && this.auras.recklessness.firstuse && this.auras.recklessness.timer) this.auras.recklessness.end();
        if (this.auras.deathwish && this.auras.deathwish.firstuse && this.auras.deathwish.timer) this.auras.deathwish.end();
        if (this.auras.cloudkeeper && this.auras.cloudkeeper.firstuse && this.auras.cloudkeeper.timer) this.auras.cloudkeeper.end();
        if (this.auras.voidmadness && this.auras.voidmadness.firstuse && this.auras.voidmadness.timer) this.auras.voidmadness.end();
        if (this.auras.flask && this.auras.flask.firstuse && this.auras.flask.timer) this.auras.flask.end();
        if (this.auras.battlestance && this.auras.battlestance.timer) this.auras.battlestance.end();
        if (this.auras.bloodfury && this.auras.bloodfury.firstuse && this.auras.bloodfury.timer) this.auras.bloodfury.end();
        if (this.auras.berserking && this.auras.berserking.firstuse && this.auras.berserking.timer) this.auras.berserking.end();
        if (this.auras.slayer && this.auras.slayer.firstuse && this.auras.slayer.timer) this.auras.slayer.end();
        if (this.auras.spider && this.auras.spider.firstuse && this.auras.spider.timer) this.auras.spider.end();
        if (this.auras.gabbar && this.auras.gabbar.firstuse && this.auras.gabbar.timer) this.auras.gabbar.end();
        if (this.auras.earthstrike && this.auras.earthstrike.firstuse && this.auras.earthstrike.timer) this.auras.earthstrike.end();
        if (this.auras.pummeler && this.auras.pummeler.firstuse && this.auras.pummeler.timer) this.auras.pummeler.end();
        if (this.auras.swarmguard && this.auras.swarmguard.firstuse && this.auras.swarmguard.timer) this.auras.swarmguard.end();
        if (this.auras.zandalarian && this.auras.zandalarian.firstuse && this.auras.zandalarian.timer) this.auras.zandalarian.end();

        if (this.mh.windfury && this.mh.windfury.timer) this.mh.windfury.end();
        if (this.trinketproc1 && this.trinketproc1.spell && this.trinketproc1.spell.timer) this.trinketproc1.spell.end();
        if (this.trinketproc2 && this.trinketproc2.spell && this.trinketproc2.spell.timer) this.trinketproc2.spell.end();
        if (this.attackproc && this.attackproc.spell && this.attackproc.spell.timer) this.attackproc.spell.end();

        if (this.auras.flurry && this.auras.flurry.timer) this.auras.flurry.end();
        if (this.auras.deepwounds && this.auras.deepwounds.timer) this.auras.deepwounds.end();
        if (this.auras.deepwounds2 && this.auras.deepwounds2.timer) this.auras.deepwounds2.end();
        if (this.auras.deepwounds3 && this.auras.deepwounds3.timer) this.auras.deepwounds3.end();
        if (this.auras.deepwounds4 && this.auras.deepwounds4.timer) this.auras.deepwounds4.end();
        if (this.auras.rend && this.auras.rend.timer) this.auras.rend.end();
        if (this.auras.flagellation && this.auras.flagellation.timer) this.auras.flagellation.end();
        if (this.auras.berserkerrage && this.auras.berserkerrage.timer) this.auras.berserkerrage.end();
        if (this.auras.consumedrage && this.auras.consumedrage.timer) this.auras.consumedrage.end();
        if (this.auras.weaponbleedmh && this.auras.weaponbleedmh.timer) this.auras.weaponbleedmh.end();
        if (this.auras.weaponbleedoh && this.auras.weaponbleedoh.timer) this.auras.weaponbleedoh.end();

    }
    rollweapon(weapon) {
        let tmp = 0;
        let roll = rng10k();
        console.log("Hello world!");
        tmp += Math.max(this.nextswinghs ? weapon.miss : weapon.dwmiss, 0) * 100;
        if (roll < tmp) return RESULT.MISS;
        tmp += weapon.dodge * 100;
        if (roll < tmp) return RESULT.DODGE;
        tmp += weapon.glanceChance * 100;
        if (roll < tmp) return RESULT.GLANCE;
        tmp += (this.crit + weapon.crit) * 100;
        if (roll < tmp) return RESULT.CRIT;
        return RESULT.HIT;
    }
    rollspell(spell) {
        let tmp = 0;
        let roll = rng10k();
        tmp += Math.max(this.mh.miss, 0) * 100;
        if (roll < tmp) return RESULT.MISS;
        if (spell.canDodge) {
            tmp += this.mh.dodge * 100;
            if (roll < tmp) return RESULT.DODGE;
        }
        if (!spell.weaponspell) {
            roll = rng10k();
            tmp = 0;
        }
        let crit = this.crit + this.mh.crit;
        if (spell instanceof Overpower)
            crit += this.talents.overpowercrit;
        tmp += crit * 100;
        if (roll < tmp && !spell.nocrit) return RESULT.CRIT;
        return RESULT.HIT;
    }
    attackmh(weapon, adjacent, damageSoFar) {
        this.stepauras();

        let spell = null;
        let procdmg = 0;
        let result;

        if (this.nextswinghs) {
            this.nextswinghs = false;
            if (this.spells.heroicstrike && this.spells.heroicstrike.cost <= this.rage) {
                result = this.rollspell(this.spells.heroicstrike);
                spell = this.spells.heroicstrike;
                this.rage -= spell.cost;
            }
            else if (this.spells.cleave && this.spells.cleave.cost <= this.rage) {
                result = this.rollspell(this.spells.cleave);
                spell = this.spells.cleave;
                if (adjacent) this.rage -= spell.cost;
            }
            else {
                result = this.rollweapon(weapon);
                /* start-log */ if (log) this.log(`Heroic Strike auto canceled`); /* end-log */
            }
        }
        else {
            result = this.rollweapon(weapon);
        }

        let dmg = weapon.dmg(spell);
        procdmg = this.procattack(spell, weapon, result, adjacent, damageSoFar);

        if (result == RESULT.DODGE) {
            this.dodgetimer = 5000;
        }
        if (result == RESULT.GLANCE) {
            dmg *= this.getGlanceReduction(weapon);
        }
        if (result == RESULT.CRIT) {
            dmg *= 2 + (spell ? this.talents.abilitiescrit : 0);
            this.proccrit(adjacent);
        }

        weapon.use();
        let done = this.dealdamage(dmg, result, weapon, spell, adjacent);
        if (spell) {
            spell.totaldmg += done;
            if (!adjacent) spell.data[result]++;
        }
        else {
            weapon.totaldmg += done;
            weapon.data[result]++;
        }
        weapon.totalprocdmg += procdmg;
        /* start-log */ if (log) this.log(`${spell ? spell.name + ' for' : 'Main hand attack for'} ${done + procdmg} (${Object.keys(RESULT)[result]})${adjacent ? ' (Adjacent)' : ''}`); /* end-log */

        if (spell instanceof Cleave && !adjacent) {
            this.nextswinghs = true;
            done += this.attackmh(weapon, 1, done);
        }
        return done + procdmg;
    }
    attackoh(weapon) {
        this.stepauras();

        let procdmg = 0;
        let result;
        result = this.rollweapon(weapon);

        let dmg = weapon.dmg();
        procdmg = this.procattack(null, weapon, result);

        if (result == RESULT.DODGE) {
            this.dodgetimer = 5000;
        }
        if (result == RESULT.GLANCE) {
            dmg *= this.getGlanceReduction(weapon);
        }
        if (result == RESULT.CRIT) {
            dmg *= 2;
            this.proccrit();
        }

        weapon.use();
        let done = this.dealdamage(dmg, result, weapon);
        weapon.data[result]++;
        weapon.totaldmg += done;
        weapon.totalprocdmg += procdmg;
        /* start-log */ if (log) this.log(`Off hand attack for ${done + procdmg} (${Object.keys(RESULT)[result]})${this.nextswinghs ? ' (HS queued)' : ''}`); /* end-log */
        return done + procdmg;
    }
    cast(spell, delayedheroic, adjacent, damageSoFar) {
        if (!adjacent) {
            this.stepauras();
            spell.use(delayedheroic);
        }
        if (spell.useonly) {
            /* start-log */ if (log) this.log(`${spell.name} used`); /* end-log */
            return 0;
        }
        let procdmg = 0;
        let dmg = spell.dmg() * this.mh.modifier;
        let result = this.rollspell(spell);
        procdmg = this.procattack(spell, this.mh, result, adjacent, damageSoFar);

        if (result == RESULT.MISS) {
            spell.failed();
        }
        else if (result == RESULT.DODGE) {
            spell.failed();
            this.dodgetimer = 5000;
        }
        else if (result == RESULT.CRIT) {
            dmg *= 2 + this.talents.abilitiescrit;
            this.proccrit(adjacent, spell);
        }

        let done = this.dealdamage(dmg, result, this.mh, spell, adjacent);
        if (!adjacent) spell.data[result]++;
        spell.totaldmg += done;
        this.mh.totalprocdmg += procdmg;
        /* start-log */ if (log) this.log(`${spell.name} for ${done + procdmg} (${Object.keys(RESULT)[result]})${adjacent ? ' (Adjacent)' : ''}.`); /* end-log */
        return done + procdmg;
    }
    dealdamage(dmg, result, weapon, spell, adjacent) {
        if (result != RESULT.MISS && result != RESULT.DODGE) {
            dmg *= this.stats.dmgmod;
            dmg *= (1 - this.armorReduction);
            if (!adjacent) this.addRage(dmg, result, weapon, spell);
            return ~~dmg;
        }
        else {
            if (!adjacent) this.addRage(dmg, result, weapon, spell);
            return 0;
        }
    }
    proccrit(adjacent, spell) {
        if (this.auras.flurry) this.auras.flurry.use();
        if (this.auras.deepwounds && !(spell instanceof SunderArmor)) {
            if (!adjacent) this.auras.deepwounds.use();
            else this.auras['deepwounds' + (~~rng(1,adjacent) + 1)].use();
        }
    }
    procattack(spell, weapon, result, adjacent, damageSoFar) {
        let procdmg = 0;
        let extras = 0;
        let batchedextras = 0;
        if (result != RESULT.MISS && result != RESULT.DODGE) {
            if (weapon.proc1 && !weapon.proc1.extra && rng10k() < weapon.proc1.chance && !(weapon.proc1.gcd && this.timer && this.timer < 1500)) {
                if (weapon.proc1.spell) weapon.proc1.spell.use();
                if (weapon.proc1.magicdmg) procdmg += weapon.proc1.chance == 10000 ? weapon.proc1.magicdmg : this.magicproc(weapon.proc1);
                if (weapon.proc1.physdmg) procdmg += this.physproc(weapon.proc1.physdmg);
                /* start-log */ if (log) this.log(`${weapon.name} proc ${procdmg ? 'for ' + procdmg : ''}`); /* end-log */
            }
            // Extra attacks roll only once per multi target attack
            if (weapon.proc1 && weapon.proc1.extra && !damageSoFar && rng10k() < weapon.proc1.chance && !(weapon.proc1.gcd && this.timer && this.timer < 1500)) {
                // Multiple extras procs off a non spel will only grant extra attack(s) from one source
                if (spell) this.extraattacks += weapon.proc1.extra;
                else extras = weapon.proc1.extra;
                /* start-log */ if (log) this.log(`${weapon.name} proc ${procdmg ? 'for ' + procdmg : ''}`); /* end-log */
            }
            if (weapon.proc2 && rng10k() < weapon.proc2.chance) {
                if (weapon.proc2.spell) weapon.proc2.spell.use();
                if (weapon.proc2.magicdmg) procdmg += this.magicproc(weapon.proc2);
            }
            if (this.trinketproc1 && !this.trinketproc1.extra && rng10k() < this.trinketproc1.chance) {
                if (this.trinketproc1.magicdmg) procdmg += this.magicproc(this.trinketproc1);
                if (this.trinketproc1.spell) this.trinketproc1.spell.use();
                /* start-log */ if (log) this.log(`Trinket 1 proc`); /* end-log */
            }
            if (this.trinketproc1 && this.trinketproc1.extra && !damageSoFar && rng10k() < this.trinketproc1.chance) {
                if (spell) this.batchedextras += this.trinketproc1.extra;
                else batchedextras = this.trinketproc1.extra;
                /* start-log */ if (log) this.log(`Trinket 1 proc`); /* end-log */
            }
            if (this.trinketproc2 && !this.trinketproc2.extra  && rng10k() < this.trinketproc2.chance) {
                if (this.trinketproc2.magicdmg) procdmg += this.magicproc(this.trinketproc2);
                if (this.trinketproc2.spell) this.trinketproc2.spell.use();
                /* start-log */ if (log) this.log(`Trinket 2 proc`); /* end-log */
            }
            if (this.trinketproc2 && this.trinketproc2.extra && !damageSoFar && rng10k() < this.trinketproc2.chance) {
                if (spell) this.batchedextras += this.trinketproc2.extra;
                else batchedextras = this.trinketproc2.extra;
                /* start-log */ if (log) this.log(`Trinket 2 proc`); /* end-log */
            }
            if (this.attackproc && rng10k() < this.attackproc.chance) {
                if (this.attackproc.magicdmg) procdmg += this.attackproc.chance == 10000 ? this.attackproc.magicdmg : this.magicproc(this.attackproc);
                if (this.attackproc.spell) this.attackproc.spell.use();
                /* start-log */ if (log) this.log(`Misc proc`); /* end-log */
            }
            // Sword spec shouldnt be able to proc itself
            if (this.talents.swordproc && weapon.type == WEAPONTYPE.SWORD && !damageSoFar && this.swordspecstep != step && rng10k() < this.talents.swordproc * 100) {
                this.swordspecstep = step;
                if (spell) this.extraattacks++;
                else extras++;
                /* start-log */ if (log) this.log(`Sword talent proc`); /* end-log */
            }
            if (weapon.windfury && !this.auras.windfury.timer && !damageSoFar && rng10k() < 2000) {
                if (!spell) extras = 0;
                weapon.windfury.use();
            }
            if (this.auras.swarmguard && this.auras.swarmguard.timer && rng10k() < this.auras.swarmguard.chance) {
                this.auras.swarmguard.proc();
            }
            if (this.auras.zandalarian && this.auras.zandalarian.timer) {
                this.auras.zandalarian.proc();
            }
            if (this.dragonbreath && rng10k() < 400) {
                procdmg += this.magicproc({ magicdmg: 60, coeff: 1 });
            }
            if (extras) this.extraattacks += extras;
            if (batchedextras) this.batchedextras += batchedextras;
        }
        if (!spell || spell instanceof HeroicStrike || (spell instanceof Cleave && !adjacent)) {
            if (this.auras.flurry && this.auras.flurry.stacks)
                this.auras.flurry.proc();
            if (this.auras.consumedrage && this.auras.consumedrage.stacks)
                this.auras.consumedrage.proc();
        }
        if (!spell) {
            if (this.mh.windfury && this.mh.windfury.stacks)
                this.mh.windfury.proc();
        }
        return procdmg;
    }
    magicproc(proc) {
        let mod = 1;
        let miss = 1700;
        let dmg = proc.magicdmg;
        if (proc.binaryspell) miss = this.target.binaryresist;
        else mod *= this.target.mitigation;
        if (rng10k() < miss) return 0;
        if (rng10k() < (this.stats.spellcrit * 100)) mod *= 1.5;
        if (proc.coeff) dmg += this.spelldamage * proc.coeff;
        return ~~(dmg * mod);
    }
    physproc(dmg) {
        let tmp = 0;
        let roll = rng10k();
        tmp += Math.max(this.mh.miss, 0) * 100;
        if (roll < tmp) dmg = 0;
        tmp += this.mh.dodge * 100;
        if (roll < tmp) { this.dodgetimer = 5000; dmg = 0; }
        roll = rng10k();
        let crit = this.crit + this.mh.crit;
        if (roll < (crit * 100)) dmg *= 2;
        return dmg * this.stats.dmgmod * this.mh.modifier;
    }
    serializeStats() {
        return {
            auras: this.auras,
            spells: this.spells,
            mh: this.mh,
            oh: this.oh,
        };
    }
    log(msg) {
        let color = '\x1b[33m';
        if (msg.indexOf('attack') > 1 || msg.indexOf('Global') > -1) color = '\x1b[90m';
        else if (msg.indexOf('tick') > 1) color = '\x1b[31m';
        else if (msg.indexOf(' for ') > -1) color = '\x1b[35m';
        else if (msg.indexOf('applied') > 1 || msg.indexOf('removed') > -1) color = '\x1b[36m';
        console.log(color+'%s\x1b[0m',`${step.toString().padStart(5,' ')} | ${this.rage.toFixed(2).padStart(6,' ')} | ${msg}`);
    }
}
