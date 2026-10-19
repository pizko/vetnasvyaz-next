// Генерирует PNG с альфа-каналом (вырезанный объект) через Apple Vision.
// usage: swift tools/cutout.swift input.jpg output.png
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: cutout in out"); exit(1) }
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
guard let ci = CIImage(contentsOf: inURL) else { print("cannot read"); exit(1) }

let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: ci)
try handler.perform([req])
guard let obs = req.results?.first else { print("no subject"); exit(2) }
let buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
let out = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
try ctx.writePNGRepresentation(of: out, to: outURL, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("ok")
