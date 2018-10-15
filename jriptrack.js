//
const fs = require("fs-extra");
const request = require("request");
const async = require("async");

//let baseurl = "https://urgi.versailles.inra.fr/jbrowseiwgsc/gmod_jbrowse/";
//let datapath = "myData/IWGSC_RefSeq_v1.0/";
let baseurl = "https://wheat.pw.usda.gov/GGbrowse/";
let datapath = "genome/whe_Ta_ABD_IWGSC-WGA-v1.0_2017/";
let trackname = "hiconf-1.1"
let targetdir = "data/"

let reqarray = {count:0,list:[ ]};

getRefSeqs(function(chrlist,err) {
    if (err) return;

    let reqtrackcount = 0;
    // chrlist is content of seq/refSeqs.json

    //fs.ensureDirSync(targetdir);

    for (i in chrlist) {
        let fi = baseurl+datapath+"tracks/"+trackname+"/"+chrlist[i].name+"/trackData.json";
        console.log("chr",chrlist[i].name,fi);

        reqtrackcount++;
        
        getTrackData(fi,chrlist[i].name,function(trackData,chrname,err){
            if (err) {
                console.log('error reading trackData.json for',chrname);
                reqtrackcount--;
                return;
            }
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
                let fi = "hist-"+histograms[j].basesPerBin+"-0.json";
                
                reqarray.list.push({url:histfile,path:dir,file:fi});
                reqarray.count++;
                //copyFile(histfile,dir,fi);
            }

            let nclist = trackData.intervals.nclist;

            for(j in nclist) {
                let lffile = baseurl+datapath+"tracks/"+trackname+"/"+chrname+"/lf-"+nclist[j][3]+".json";
                //console.log(lffile);

                // write lf-*.json
                let fi = "lf-"+nclist[j][3]+".json";

                reqarray.list.push({url:lffile,path:dir,file:fi});
                reqarray.count++;
                //copyFile(lffile,dir,fi);
            }
            reqtrackcount--;
        });

    }
    // detect when all trackData.json requests are completed
    let t = setInterval(function(){
        if (reqtrackcount==0) {
            clearInterval(t);
        
            console.log("Starting requests "+reqarray.count);

            // assuming openFiles is an array of file names
            async.eachLimit(reqarray.list,100, function(item, cb) {
                copyFile(item,function(item,err){
                    reqarray.count--;
                    if (err) {
                        console.log("request failed",item.url);
                        return cb(err);
                    }
                    item.complete = true;
                    process.stdout.write("requests remaining "+reqarray.count+" - "+item.path+item.file+"         \r");
                    cb();
                });
            }, function(err) {
                // if any of the file processing produced an error, err would equal that error
                if( err ) {
                // One of the iterations produced an error.
                // All processing will now stop.
                console.log('A file failed to process');
                } else {
                console.log('All files have been processed successfully');
                }
            });                

            let lastcount = 0
            let t2 = setInterval(function() {
                if (reqarray.count === lastcount) {
                    clearInterval(t2);
                    console.log("remaining requests ",reqarray.count);

                    for(k in reqarray.list) {
                        if (typeof reqarray.list[k].complete === 'undefined') {
                            console.log(k,reqarray.list[k].path+" "+reqarray.list[k].file);
                        }
                    }
                }
                lastcount = reqarray.count;
            },500);
            

        }
    },500);
    //console.log(json);
});

/*
    get refSeqs.json file 
*/
function getRefSeqs(cb) {
    let seqdatafile = baseurl+datapath+"seq/refSeqs.json";

    request(seqdatafile, function (err, response, body) {
        if (err) return cb(null,err);
        return cb(JSON.parse(body),null);
      });
}
/*
    get trackData.json
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
function copyFile(item,cb) {
    request(item.url, function (err, response, body) {
        if (err) return cb(item,err);

        fs.ensureDirSync(item.path);
        fs.writeFile(item.path+item.file,body);
        //console.log("completed -",filedir+fi);
        return cb(item);
      });
}
