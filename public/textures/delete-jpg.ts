import fs from "fs";
import path from "path";

const currentPath = path.join(__dirname);
console.log(currentPath);

function readFilesFromPath(path: string): fs.Dirent[] {
  const files = fs.readdirSync(path, {
    encoding: "utf-8",
    withFileTypes: true,
  });
  return files;
}

function getFileFormat(fileName: string): string {
  return path.extname(fileName);
}

function deleteFile(filePath: string): void {
  fs.rm(filePath, {}, (err) => {
    console.log(err);
  });
}

function deleteJpgFiles(path: string = currentPath): void {
  try {
    const files: fs.Dirent[] = readFilesFromPath(path);

    for (const file of files) {
      const iteratedPath: string = `${path}/${file.name}`;
      if (file.isDirectory()) {
        console.info("Recursing into directory", iteratedPath);
        deleteJpgFiles(iteratedPath);
      }

      const fileFormat: string = getFileFormat(file.name);
      const isJpg: boolean = [".jpg", ".jpeg"].includes(fileFormat);
      if (!isJpg) {
        continue;
      }

      console.info(`Deleting ${file.name}`, iteratedPath);
      deleteFile(iteratedPath);
    }
  } catch (error) {
    console.error(error);
  }
}

deleteJpgFiles();
