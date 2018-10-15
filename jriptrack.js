//
const fs = require("fs-extra");
const request = require("request");

//let baseurl = "https://urgi.versailles.inra.fr/jbrowseiwgsc/gmod_jbrowse/";
//let datapath = "myData/IWGSC_RefSeq_v1.0/";
let baseurl = "https://wheat.pw.usda.gov/GGbrowse/";
let datapath = "genome/whe_Ta_ABD_IWGSC-WGA-v1.0_2017/";
let trackname = "hiconf-1.1"
let targetdir = "data/"

getRefSeqs(function(chrlist,err) {
    if (err) return;

    // chrlist is content of seq/refSeqs.json

    //fs.ensureDirSync(targetdir);

    for (i in chrlist) {
        let fi = baseurl+datapath+"tracks/"+trackname+"/"+chrlist[i].name+"/trackData.json";
        console.log("chr",chrlist[i].name,fi);

        getTrackData(fi,chrlist[i].name,function(trackData,chrname,err){
            if (err) return;
            //got trackData.json

            let dir = targetdir+'tracks/'+trackname+'/'+chrname+'/';
            fs.ensureDirSync(dir);

            // write trackData.json
            fs.writeFileSync(dir+"trackData.json",JSON.stringify(trackData));

            let histograms = trackData.histograms.stats;

            for(j in histograms) {
                let histfile = baseurl+datapath+"tracks/"+trackname+"/"+chrname+"/hist-"+histograms[j].basesPerBin+"-0.json";
                //console.log(histfile);

                // write hist-*-0.json
                let fi = "hist-"+histograms[j].basesPerBin+"-0.json"
                copyFile(histfile,dir,fi);
            }

            let nclist = trackData.intervals.nclist;

            for(j in nclist) {
                let lffile = baseurl+datapath+"tracks/"+trackname+"/"+chrname+"/lf-"+nclist[j][3]+".json";
                //console.log(lffile);

                // write lf-*.json
                let fi = "lf-"+nclist[j][3]+".json"
                copyFile(lffile,dir,fi);
            }
        })
    }
    //console.log(json);
});


function getRefSeqs(cb) {
    let seqdatafile = baseurl+datapath+"seq/refSeqs.json";

    request(seqdatafile, function (err, response, body) {
        if (err) return cb(null,err);
        return cb(JSON.parse(body),null);
      });
}
/*
    fi - filename
    chrname chromosome
    cb callback
*/
function getTrackData(fi,chrname,cb) {
    request(fi, function (err, response, body) {
        if (err) return cb(null,null,err);
        return cb(JSON.parse(body),chrname,null);
      });
}
/*
    copies a file (fi) from fileurl to filedir
*/
function copyFile(fileurl,filedir,fi) {
    request(fileurl, function (err, response, body) {
        if (err) return;

        fs.ensureDirSync(filedir);
        fs.writeFile(filedir+fi,body);
        console.log("completed -",filedir+fi);
      });
}
