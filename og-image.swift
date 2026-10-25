// Rebuild on macOS: swift og-image.swift (AppKit only; no downloaded assets).
import AppKit
let w = 1200, h = 630
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> NSColor { NSColor(srgbRed: r, green: g, blue: b, alpha: a) }
func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ c: NSColor) { c.setFill(); NSBezierPath(rect: NSRect(x:x,y:y,width:w,height:h)).fill() }
func line(_ points: [NSPoint], _ c: NSColor, _ width: CGFloat = 1) { c.setStroke(); let p=NSBezierPath(); p.move(to:points[0]); for point in points.dropFirst() {p.line(to:point)};p.lineWidth=width;p.stroke() }
func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ weight: NSFont.Weight, _ c: NSColor, mono: Bool = false) { (value as NSString).draw(at:NSPoint(x:x,y:y),withAttributes:[.font:mono ? NSFont.monospacedSystemFont(ofSize:size,weight:weight) : NSFont.systemFont(ofSize:size,weight:weight),.foregroundColor:c]) }
let ink=color(0.035,0.055,0.075), teal=color(0.36,0.94,0.82), white=color(0.92,0.96,0.95), muted=color(0.53,0.64,0.66)
rect(0,0,1200,630,ink)
// A restrained architectural corridor converges on the extraction gate.
for i in 0...10 { let x=CGFloat(650+i*55); line([NSPoint(x:x,y:100),NSPoint(x:940+(x-940)*0.16,y:300)],color(0.12,0.22,0.24)) }
for y in stride(from: 110, through: 290, by: 36) {line([NSPoint(x:650,y:CGFloat(y)),NSPoint(x:1190,y:CGFloat(y))],color(0.10,0.17,0.20))}
for i in 0...4 { let inset=CGFloat(i)*37; let left=CGFloat(688)+inset, right=CGFloat(1190)-inset, bottom=CGFloat(106)+inset, top=CGFloat(534)-inset
line([NSPoint(x:left,y:bottom),NSPoint(x:left,y:top),NSPoint(x:right,y:top),NSPoint(x:right,y:bottom)],color(0.13,0.27,0.29),2)
line([NSPoint(x:left+8,y:top-12),NSPoint(x:left+8,y:top-65)],teal,3)
}
rect(910,286,66,105,color(0.07,0.21,0.20)); line([NSPoint(x:910,y:286),NSPoint(x:910,y:391),NSPoint(x:976,y:391),NSPoint(x:976,y:286)],teal,3)
text("07",919,319,30,.medium,teal,mono:true)
// Solid editorial panel keeps the title readable at thumbnail size.
rect(0,0,660,630,ink)
rect(64,526,36,4,teal)
text("EXTRACTION PROTOCOL",114,515,16,.medium,teal,mono:true)
text("SECTOR",58,337,100,.black,white)
text("ZERO 7.",58,225,100,.black,white)
text("RECOVER. SURVIVE. EXTRACT.",64,177,19,.medium,muted,mono:true)
rect(64,111,72,2,teal)
text("FIRST-PERSON  /  WEBGL",64,66,15,.medium,white,mono:true)
text("S / 07",1040,48,18,.semibold,teal,mono:true)
NSGraphicsContext.restoreGraphicsState()
let png=bitmap.representation(using:.png,properties:[:])!
try png.write(to:URL(fileURLWithPath:"og-image.png"))
print("Wrote og-image.png (1200 × 630)")
