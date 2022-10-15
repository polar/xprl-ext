import {promises as fs} from "fs";


let logObjects: any[] = []
let nLogObject = 0

export function resetLog() {
    logObjects = []
}


let file: fs.FileHandle | undefined = undefined

export function log<T>(obj: T): T {
    nLogObject++
    if (logObjects.length === 1000) {
        // Write asynchronously
        writeLogObjectsToFile(fileName, logObjects).then(r => {
        })
        logObjects = []
    }
    // Make sure everything is an object
    let logObject = {v: obj}
    let str = JSON.stringify(logObject, null, 2)
    console.log(str);
    logObjects.push(logObject)
    if (file) {
        // Write asynchronously
        file.write(str + "\n,\n").then(() => file?.datasync())
    }
    return obj
}

let fileName = "log.json"
let baseFileName = "log"

export async function startLog(name: string) {
    let fn = await getNextLogFile(name)
    fileName = fn.replace("-", "_")
    file = await fs.open(fn, "w+")
    await file.write("[\n")
    await file.datasync()
}

export async function endLog() {
    if (file) {
        await file.write("]\n")
        await file.close()
        file = undefined
    }
}

export async function getNextLogFile(name: string) {
    let exists = await fs.lstat(name)
        .then(res => res.isFile())
        .catch(reason => false)
    while (exists) {
        let dirname = name.match(/^(.*)\/([^/]*)$/)
        let prefix = ""
        if (dirname) {
            prefix = dirname[1] + "/"
            name = dirname[2]
        }
        let baseName = name.match(/(([A-Za-z0-9_]*)(-([0-9]*))?)(\.json)?$/)
        if (baseName) {
            let num = 1
            if (baseName[4] && baseName[4] !== '') {
                num = Number(baseName[4]) + 1
            }
            name = `${prefix}${baseName[2]!}-${num}.json`
            exists = await fs.lstat(name)
                .then(res => res.isFile())
                .catch(reason => false)
        } else {
            exists = false
        }
    }
    return name
}

export async function writeLogObjectsToFile(name: string, objects: any[]) {
    name = await getNextLogFile(name)
    return fs.writeFile(name, JSON.stringify(objects, null, 2))
}
