/*!
 * Lattice Reports
 */

var sys = require("sys"),
	events = require("events"),
	sprintf = require("sprintf").sprintf,
	formatDate = require("./format").formatDate,
	self,
	buf,
	finished,
	lineEndStyle,
	objNo,
	radsInCircle = Math.PI * 2,	//6.283185307179586;
	degreesInRad = 360 / radsInCircle,	//57.295779513082325;
	GRAPHICS = 0,
	TEXT = 1,
	//Report field types
	T_LITERAL = 0,	// xxx,    Literal String
	T_FIELD = 1,	// {xxx},  Data field
	T_FORMULA = 2,	// {@xxx}, Formula field (not implemented)
	T_RUNNING = 3,	// {#xxx}, Running Total field (Only SUM and COUNT operations supported)
	T_SPECIAL = 4,	// {*xxx}, Special field (such as PageNumber)
	T_CALLBACK = 5,// {^xxx], callback field (this is the real formula field)
	T_COMPLEX = 6,	// Mixture of any of the above
	// Output section types
	O_WATERMARK = 0,
	O_HEADER = 1,
	O_FOOTER = 2,
	O_PAGE = 3,
	O_FIRST = O_WATERMARK,
	O_LAST = O_PAGE,
	fileOffset,		// The number of characters that have been written to the file
	fontObjects = [],// Array of indices into pdfObjects for the supported fonts
	pageTree,		// Index into pdfObjects for the Page Tree object
	pdfObjects = [],// Array holding byte offsets to the start of all objects in the PDF file
	output = [],	// Array holding all output streams
	outputIndex,
	outputs = ["Watermark","Header","Footer","Page"],
	pageRefs = [],	// Array holding the reference to the page objects pdfPageRefs.length = the number of pages
	pdfState = {};	// Cache the internal state of PDF parameters (to keep us from resetting things over & over

// Fonts and their metrics.  The metrics are stored for the font face and then characters that have
// different metrics for the bold/italic combinations are stored in their metrics.
var fonts = [
	{	aliases:	['helvetica','arial'],
		metrics:	{32:278,33:278,34:355,35:556,36:556,37:889,38:667,39:222,40:333,41:333,42:389,43:584,44:278,45:333,46:278,47:278,48:556,49:556,50:556,51:556,52:556,53:556,54:556,55:556,56:556,57:556,58:278,59:278,60:584,61:584,62:584,63:556,64:1015,65:667,66:667,67:722,68:722,69:667,70:611,71:778,72:722,73:278,74:500,75:667,76:556,77:833,78:722,79:778,80:667,81:778,82:722,83:667,84:611,85:722,86:667,87:944,88:667,89:667,90:611,91:278,92:278,93:278,94:469,95:556,96:222,97:556,98:556,99:500,100:556,101:556,102:278,103:556,104:556,105:222,106:222,107:500,108:222,109:833,110:556,111:556,112:556,113:556,114:333,115:500,116:278,117:556,118:500,119:722,120:500,121:500,122:500,123:334,124:260,125:334,126:584},
		normal:		{	name:				'Helvetica',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			718,
						XHeight:			523,
						Ascender:			718,
						Descender:			-207,
						metrics:			{},
						kern:{
							'A':	{'C':30,'G':30,'O':30,'Q':30,'T':120,'U':50,'V':70,'W':50,'Y':100,'u':30,'v':40,'w':40,'y':40},
							'B':	{'U':10},
							'D':	{'A':40,'V':70,'W':40,'Y':90},
							'F':	{'A':80,'a':50,'e':30,'o':30,'r':45},
							'J':	{'A':20,'a':20,'u':20},
							'K':	{'O':50,'e':40,'o':40,'u':30,'y':50},
							'L':	{'T':110,'V':110,'W':70,'Y':140,'y':30},
							'O':	{'A':20,'T':40,'V':50,'W':30,'X':60,'Y':70},
							'P':	{'A':120,'a':40,'e':50,'o':50},
							'Q':	{'U':10},
							'R':	{'O':20,'T':30,'U':40,'V':50,'W':30,'Y':50},
							'T':	{'A':120,'O':40,'a':120,'e':120,'o':120,'r':120,'u':120,'w':120,'y':120},
							'U':	{'A':40},
							'V':	{'A':80,'G':40,'O':40,'a':70,'e':80,'o':80,'u':70},
							'W':	{'A':50,'O':20,'a':40,'e':30,'o':30,'u':30,'y':20},
							'Y':	{'A':110,'O':85,'a':140,'e':140,'i':20,'o':140,'u':110},
							'a':	{'v':20,'w':20,'y':30},
							'b':	{'b':10,'l':20,'u':20,'v':20,'y':20},
							'c':	{'k':20},
							'e':	{'v':30,'w':20,'x':30,'y':20},
							'f':	{'a':30,'e':30,'o':30},
							'g':	{'r':10},
							'h':	{'y':30},
							'k':	{'e':20,'o':20},
							'm':	{'u':10,'y':15},
							'n':	{'u':10,'v':20,'y':15},
							'o':	{'v':15,'w':15,'x':30,'y':30},
							'p':	{'y':30},
							'r':	{'a':10,'i':15,'k':15,'l':15,'m':25,'n':25,'p':30,'t':40,'u':15,'v':30,'y':30},
							's':	{'w':30},
							'v':	{'a':25,'e':25,'o':25},
							'w':	{'a':15,'e':10,'o':10},
							'x':	{'e':30},
							'y':	{'a':20,'e':20,'o':20},
							'z':	{'e':15,'o':15}
				}
			},
		bold:		{	name:				'Helvetica-Bold',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			718,
						XHeight:			532,
						Ascender:			718,
						Descender:			-207,
						metrics:			{33:333,34:474,38:722,39:278,58:333,59:333,63:611,64:975,65:722,66:722,74:556,75:722,76:611,91:333,93:333,94:584,96:278,98:611,99:556,100:611,102:333,103:611,104:611,105:278,106:278,107:556,108:278,109:889,110:611,111:611,112:611,113:611,114:389,115:556,116:333,117:611,118:556,119:778,120:556,121:556,123:389,124:280,125:389},
						kern:{
							'A':	{'C':40,'G':50,'O':40,'Q':40,'T':90,'U':50,'V':80,'W':60,'Y':110,'u':30,'v':40,'w':30,'y':30},
							'B':	{'A':30,'U':10},
							'D':	{'A':40,'V':40,'W':40,'Y':70},
							'F':	{'A':80,'a':20},
							'J':	{'A':20,'u':20},
							'K':	{'O':30,'e':15,'o':35,'u':30,'y':40},
							'L':	{'T':90,'V':110,'W':80,'Y':120,'y':30},
							'O':	{'A':50,'T':40,'V':50,'W':50,'X':50,'Y':70},
							'P':	{'A':100,'a':30,'e':30,'o':40},
							'Q':	{'U':10},
							'R':	{'O':20,'T':20,'U':20,'V':50,'W':40,'Y':50},
							'T':	{'A':90,'O':40,'a':80,'e':60,'o':80,'r':80,'u':90,'w':60,'y':60},
							'U':	{'A':50},
							'V':	{'A':80,'G':50,'O':50,'a':60,'e':50,'o':90,'u':60},
							'W':	{'A':60,'O':20,'a':40,'e':35,'o':60,'u':45,'y':20},
							'Y':	{'A':110,'O':70,'a':90,'e':80,'o':100,'u':100},
							'a':	{'g':10,'v':15,'w':15,'y':20},
							'b':	{'l':10,'u':20,'v':20,'y':20},
							'c':	{'h':10,'k':20,'l':20,'y':10},
							'd':	{'d':10,'v':15,'w':15,'y':15},
							'e':	{'v':15,'w':15,'x':15,'y':15},
							'f':	{'e':10,'o':20},
							'g':	{'e':10,'g':10},
							'h':	{'y':20},
							'k':	{'o':15},
							'l':	{'w':15,'y':15},
							'm':	{'u':20,'y':30},
							'n':	{'u':10,'v':40,'y':20},
							'o':	{'v':20,'w':15,'x':30,'y':20},
							'p':	{'y':15},
							'r':	{'c':20,'d':20,'g':15,'o':20,'q':20,'s':15,'t':20,'v':10,'y':10},
							's':	{'w':15},
							'v':	{'a':20,'o':30},
							'w':	{'o':20},
							'x':	{'e':10},
							'y':	{'a':30,'e':10,'o':25},
							'z':	{'e':10}
				}
			},
		italic:		{	name:				'Helvetica-Oblique',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			718,
						XHeight:			523,
						Ascender:			718,
						Descender:			-207,
						metrics:			{},
						kern:{
							'A':	{'C':30,'G':30,'O':30,'Q':30,'T':120,'U':50,'V':70,'W':50,'Y':100,'u':30,'v':40,'w':40,'y':40},
							'B':	{'U':10},
							'D':	{'A':40,'V':70,'W':40,'Y':90},
							'F':	{'A':80,'a':50,'e':30,'o':30,'r':45},
							'J':	{'A':20,'a':20,'u':20},
							'K':	{'O':50,'e':40,'o':40,'u':30,'y':50},
							'L':	{'T':110,'V':110,'W':70,'Y':140,'y':30},
							'O':	{'A':20,'T':40,'V':50,'W':30,'X':60,'Y':70},
							'P':	{'A':120,'a':40,'e':50,'o':50},
							'Q':	{'U':10},
							'R':	{'O':20,'T':30,'U':40,'V':50,'W':30,'Y':50},
							'T':	{'A':120,'O':40,'a':120,'e':120,'o':120,'r':120,'u':120,'w':120,'y':120},
							'U':	{'A':40},
							'V':	{'A':80,'G':40,'O':40,'a':70,'e':80,'o':80,'u':70},
							'W':	{'A':50,'O':20,'a':40,'e':30,'o':30,'u':30,'y':20},
							'Y':	{'A':110,'O':85,'a':140,'e':140,'i':20,'o':140,'u':110},
							'a':	{'v':20,'w':20,'y':30},
							'b':	{'b':10,'l':20,'u':20,'v':20,'y':20},
							'c':	{'k':20},
							'e':	{'v':30,'w':20,'x':30,'y':20},
							'f':	{'a':30,'e':30,'o':30},
							'g':	{'r':10},
							'h':	{'y':30},
							'k':	{'e':20,'o':20},
							'm':	{'u':10,'y':15},
							'n':	{'u':10,'v':20,'y':15},
							'o':	{'v':15,'w':15,'x':30,'y':30},
							'p':	{'y':30},
							'r':	{'a':10,'i':15,'k':15,'l':15,'m':25,'n':25,'p':30,'t':40,'u':15,'v':30,'y':30},
							's':	{'w':30},
							'v':	{'a':25,'e':25,'o':25},
							'w':	{'a':15,'e':10,'o':10},
							'x':	{'e':30},
							'y':	{'a':20,'e':20,'o':20},
							'z':	{'e':15,'o':15}
				}
			},
		bolditalic:	{	name:				'Helvetica-BoldOblique',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			718,
						XHeight:			532,
						Ascender:			718,
						Descender:			-207,
						metrics:			{33:333,34:474,38:722,39:278,58:333,59:333,63:611,64:975,65:722,66:722,74:556,75:722,76:611,91:333,93:333,94:584,96:278,98:611,99:556,100:611,102:333,103:611,104:611,105:278,106:278,107:556,108:278,109:889,110:611,111:611,112:611,113:611,114:389,115:556,116:333,117:611,118:556,119:778,120:556,121:556,123:389,124:280,125:389},
						kern:{
							'A':	{'C':40,'G':50,'O':40,'Q':40,'T':90,'U':50,'V':80,'W':60,'Y':110,'u':30,'v':40,'w':30,'y':30},
							'B':	{'A':30,'U':10},
							'D':	{'A':40,'V':40,'W':40,'Y':70},
							'F':	{'A':80,'a':20},
							'J':	{'A':20,'u':20},
							'K':	{'O':30,'e':15,'o':35,'u':30,'y':40},
							'L':	{'T':90,'V':110,'W':80,'Y':120,'y':30},
							'O':	{'A':50,'T':40,'V':50,'W':50,'X':50,'Y':70},
							'P':	{'A':100,'a':30,'e':30,'o':40},
							'Q':	{'U':10},
							'R':	{'O':20,'T':20,'U':20,'V':50,'W':40,'Y':50},
							'T':	{'A':90,'O':40,'a':80,'e':60,'o':80,'r':80,'u':90,'w':60,'y':60},
							'U':	{'A':50},
							'V':	{'A':80,'G':50,'O':50,'a':60,'e':50,'o':90,'u':60},
							'W':	{'A':60,'O':20,'a':40,'e':35,'o':60,'u':45,'y':20},
							'Y':	{'A':110,'O':70,'a':90,'e':80,'o':100,'u':100},
							'a':	{'g':10,'v':15,'w':15,'y':20},
							'b':	{'l':10,'u':20,'v':20,'y':20},
							'c':	{'h':10,'k':20,'l':20,'y':10},
							'd':	{'d':10,'v':15,'w':15,'y':15},
							'e':	{'v':15,'w':15,'x':15,'y':15},
							'f':	{'e':10,'o':20},
							'g':	{'e':10,'g':10},
							'h':	{'y':20},
							'k':	{'o':15},
							'l':	{'w':15,'y':15},
							'm':	{'u':20,'y':30},
							'n':	{'u':10,'v':40,'y':20},
							'o':	{'v':20,'w':15,'x':30,'y':20},
							'p':	{'y':15},
							'r':	{'c':20,'d':20,'g':15,'o':20,'q':20,'s':15,'t':20,'v':10,'y':10},
							's':	{'w':15},
							'v':	{'a':20,'o':30},
							'w':	{'o':20},
							'x':	{'e':10},
							'y':	{'a':30,'e':10,'o':25},
							'z':	{'e':10}
				}
			}
	},
	{	aliases:	['times roman','times new roman'],
		metrics:	{32:250,33:333,34:408,35:500,36:500,37:833,38:778,39:333,40:333,41:333,42:500,43:564,44:250,45:333,46:250,47:278,48:500,49:500,50:500,51:500,52:500,53:500,54:500,55:500,56:500,57:500,58:278,59:278,60:564,61:564,62:564,63:444,64:921,65:722,66:667,67:667,68:722,69:611,70:556,71:722,72:722,73:333,74:389,75:722,76:611,77:889,78:722,79:722,80:556,81:722,82:667,83:556,84:611,85:722,86:722,87:944,88:722,89:722,90:611,91:333,92:278,93:333,94:469,95:500,96:333,97:444,98:500,99:444,100:500,101:444,102:333,103:500,104:500,105:278,106:278,107:500,108:278,109:778,110:500,111:500,112:500,113:500,114:333,115:389,116:278,117:500,118:500,119:722,120:500,121:500,122:444,123:480,124:200,125:480,126:541},
		normal:		{	name:				'Times-Roman',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			662,
						XHeight:			450,
						Ascender:			683,
						Descender:			-217,
						metrics:			{},
						kern:{
							'A':	{'C':40,'G':40,'O':55,'Q':55,'T':111,'U':55,'V':135,'W':90,'Y':105,'v':74,'w':92,'y':92},
							'B':	{'A':35,'U':10},
							'D':	{'A':40,'V':40,'W':30,'Y':55},
							'F':	{'A':74,'a':15,'o':15},
							'J':	{'A':60},
							'K':	{'O':30,'e':25,'o':35,'u':15,'y':25},
							'L':	{'T':92,'V':100,'W':74,'Y':100,'y':55},
							'N':	{'A':35},
							'O':	{'A':35,'T':40,'V':50,'W':35,'X':40,'Y':50},
							'P':	{'A':92,'a':15},
							'Q':	{'U':10},
							'R':	{'O':40,'T':60,'U':40,'V':80,'W':55,'Y':65},
							'T':	{'A':93,'O':18,'a':80,'e':70,'i':35,'o':80,'r':35,'u':45,'w':80,'y':80},
							'U':	{'A':40},
							'V':	{'A':135,'G':15,'O':40,'a':111,'e':111,'i':60,'o':129,'u':75},
							'W':	{'A':120,'O':10,'a':80,'e':80,'i':40,'o':80,'u':50,'y':73},
							'Y':	{'A':120,'O':30,'a':100,'e':100,'i':55,'o':110,'u':111},
							'a':	{'v':20,'w':15},
							'b':	{'u':20,'v':15},
							'c':	{'y':15},
							'e':	{'g':15,'v':25,'w':25,'x':15,'y':15},
							'f':	{'a':10,'f':25,'i':20},
							'g':	{'a':5},
							'h':	{'y':5},
							'i':	{'v':25},
							'k':	{'e':10,'o':10,'y':15},
							'l':	{'w':10},
							'n':	{'v':40,'y':15},
							'o':	{'v':15,'w':25,'y':10},
							'p':	{'y':10},
							'r':	{'g':18},
							'v':	{'a':25,'e':15,'o':20},
							'w':	{'a':10,'o':10},
							'x':	{'e':15}
				}
			},
		bold:		{	name:				'Times-Bold',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			676,
						XHeight:			461,
						Ascender:			683,
						Descender:			-217,
						metrics:			{34:555,37:1000,38:833,43:570,58:333,59:333,60:570,61:570,62:570,63:500,64:930,67:722,69:667,70:611,71:778,72:778,73:389,74:500,75:778,76:667,77:944,79:778,80:611,81:778,82:722,84:667,87:1000,90:667,94:581,97:500,98:556,100:556,104:556,106:333,107:556,109:833,110:556,112:556,113:556,114:444,116:333,117:556,123:394,124:220,125:394,126:520},
						kern:{
							'A':	{'C':55,'G':55,'O':45,'Q':45,'T':95,'U':50,'V':145,'W':130,'Y':100,'p':25,'u':50,'v':100,'w':90,'y':74},
							'B':	{'A':30,'U':10},
							'D':	{'A':35,'V':40,'W':40,'Y':40},
							'F':	{'A':90,'a':25,'e':25,'o':25},
							'J':	{'A':30,'a':15,'e':15,'o':15,'u':15},
							'K':	{'O':30,'e':25,'o':25,'u':15,'y':45},
							'L':	{'T':92,'V':92,'W':92,'Y':92,'y':55},
							'N':	{'A':20},
							'O':	{'A':40,'T':40,'V':50,'W':50,'X':40,'Y':50},
							'P':	{'A':74,'a':10,'e':20,'o':20},
							'Q':	{'U':10},
							'R':	{'O':30,'T':40,'U':30,'V':55,'W':35,'Y':35},
							'T':	{'A':90,'O':18,'a':92,'e':92,'i':18,'o':92,'r':74,'u':92,'w':74,'y':34},
							'U':	{'A':60},
							'V':	{'A':135,'G':30,'O':45,'a':92,'e':100,'i':37,'o':100,'u':92},
							'W':	{'A':120,'O':10,'a':65,'e':65,'i':18,'o':75,'u':50,'y':60},
							'Y':	{'A':110,'O':35,'a':85,'e':111,'i':37,'o':111,'u':92},
							'a':	{'v':25},
							'b':	{'b':10,'u':20,'v':15},
							'd':	{'w':15},
							'e':	{'v':15},
							'f':	{'i':25,'o':25},
							'h':	{'y':15},
							'i':	{'v':10},
							'k':	{'e':10,'o':15,'y':15},
							'n':	{'v':40},
							'o':	{'v':10,'w':10},
							'r':	{'c':18,'e':18,'g':10,'n':15,'o':18,'p':10,'q':18,'v':10},
							'v':	{'a':10,'e':10,'o':10},
							'w':	{'o':10},
							'y':	{'e':10,'o':25}
				}
			},
		italic:		{	name:				'Times-Italic',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			653,
						XHeight:			441,
						Ascender:			683,
						Descender:			-217,
						metrics:			{34:420,43:675,58:333,59:333,60:675,61:675,62:675,63:500,64:920,65:611,66:611,70:611,74:444,75:667,76:556,77:833,78:667,80:611,82:611,83:500,84:556,86:611,87:833,88:611,89:556,90:556,91:389,93:389,94:422,97:500,102:278,107:444,109:722,114:389,118:444,119:667,120:444,121:444,122:389,123:400,124:275,125:400},
						kern:{
							'A':	{'C':30,'G':35,'O':40,'Q':40,'T':37,'U':50,'V':105,'W':95,'Y':55,'u':20,'v':55,'w':55,'y':55},
							'B':	{'A':25,'U':10},
							'D':	{'A':35,'V':40,'W':40,'Y':40},
							'F':	{'A':115,'a':75,'e':75,'i':45,'o':105,'r':55},
							'J':	{'A':40,'a':35,'e':25,'o':25,'u':35},
							'K':	{'O':50,'e':35,'o':40,'u':40,'y':40},
							'L':	{'T':20,'V':55,'W':55,'Y':20,'y':30},
							'N':	{'A':27},
							'O':	{'A':55,'T':40,'V':50,'W':50,'X':40,'Y':50},
							'P':	{'A':90,'a':80,'e':80,'o':80},
							'Q':	{'U':10},
							'R':	{'O':40,'U':40,'V':18,'W':18,'Y':18},
							'T':	{'A':50,'O':18,'a':92,'e':92,'i':55,'o':92,'r':55,'u':55,'w':74,'y':74},
							'U':	{'A':40},
							'V':	{'A':60,'O':30,'a':111,'e':111,'i':74,'o':111,'u':74},
							'W':	{'A':60,'O':25,'a':92,'e':92,'i':55,'o':92,'u':55,'y':70},
							'Y':	{'A':50,'O':15,'a':92,'e':92,'i':74,'o':92,'u':92},
							'a':	{'g':10},
							'b':	{'u':20},
							'c':	{'h':15,'k':20},
							'e':	{'g':40,'v':15,'w':15,'x':20,'y':30},
							'f':	{'f':18,'i':20},
							'g':	{'e':10,'g':10},
							'k':	{'e':10,'o':10,'y':10},
							'n':	{'v':40},
							'o':	{'g':10,'v':10},
							'r':	{'a':15,'c':37,'d':37,'e':37,'g':37,'o':45,'q':37,'s':10}
				}
			},
		bolditalic:	{	name:				'Times-BoldItalic',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			669,
						XHeight:			462,
						Ascender:			683,
						Descender:			-217,
						metrics:			{33:389,34:555,43:570,58:333,59:333,60:570,61:570,62:570,63:500,64:832,65:667,69:667,70:667,72:778,73:389,74:500,75:667,80:611,86:667,87:889,88:667,89:611,94:570,97:500,104:556,110:556,114:389,117:556,118:444,119:667,121:444,122:389,123:348,124:220,125:348,126:570},
						kern:{
							'A':	{'C':65,'G':60,'O':50,'Q':55,'T':55,'U':50,'V':95,'W':100,'Y':70,'u':30,'v':74,'w':74,'y':74},
							'B':	{'A':25,'U':10},
							'D':	{'A':25,'V':50,'W':40,'Y':50},
							'F':	{'A':100,'a':95,'e':100,'i':40,'o':70,'r':50},
							'J':	{'A':25,'a':40,'e':40,'o':40,'u':40},
							'K':	{'O':30,'e':25,'o':25,'u':20,'y':20},
							'L':	{'T':18,'V':37,'W':37,'Y':37,'y':37},
							'N':	{'A':30},
							'O':	{'A':40,'T':40,'V':50,'W':50,'X':40,'Y':50},
							'P':	{'A':85,'a':40,'e':50,'o':55},
							'Q':	{'U':10},
							'R':	{'O':40,'T':30,'U':40,'V':18,'W':18,'Y':18},
							'T':	{'A':55,'O':18,'a':92,'e':92,'i':37,'o':95,'r':37,'u':37,'w':37,'y':37},
							'U':	{'A':45},
							'V':	{'A':85,'G':10,'O':30,'a':111,'e':111,'i':55,'o':111,'u':55},
							'W':	{'A':74,'O':15,'a':85,'e':90,'i':37,'o':80,'u':55,'y':55},
							'Y':	{'A':74,'O':25,'a':92,'e':111,'i':55,'o':111,'u':92},
							'b':	{'b':10,'u':20},
							'c':	{'h':10,'k':10},
							'e':	{'b':10},
							'f':	{'e':10,'f':18,'o':10},
							'k':	{'e':30,'o':10},
							'n':	{'v':40},
							'o':	{'v':15,'w':25,'x':10,'y':10},
							'v':	{'e':15,'o':15},
							'w':	{'a':10,'e':10,'o':15},
							'x':	{'e':10}
				}
			}
	},
	{	aliases:	['courier','courier new'],
		metrics:	{32:600,33:600,34:600,35:600,36:600,37:600,38:600,39:600,40:600,41:600,42:600,43:600,44:600,45:600,46:600,47:600,48:600,49:600,50:600,51:600,52:600,53:600,54:600,55:600,56:600,57:600,58:600,59:600,60:600,61:600,62:600,63:600,64:600,65:600,66:600,67:600,68:600,69:600,70:600,71:600,72:600,73:600,74:600,75:600,76:600,77:600,78:600,79:600,80:600,81:600,82:600,83:600,84:600,85:600,86:600,87:600,88:600,89:600,90:600,91:600,92:600,93:600,94:600,95:600,96:600,97:600,98:600,99:600,100:600,101:600,102:600,103:600,104:600,105:600,106:600,107:600,108:600,109:600,110:600,111:600,112:600,113:600,114:600,115:600,116:600,117:600,118:600,119:600,120:600,121:600,122:600,123:600,124:600,125:600,126:600},
		normal:		{	name:				'Courier',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			562,
						XHeight:			426,
						Ascender:			629,
						Descender:			-157,
						metrics:			{},
						kern:				null
			},
		bold:		{	name:				'Courier-Bold',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			562,
						XHeight:			439,
						Ascender:			629,
						Descender:			-157,
						metrics:			{},
						kern:				null
			},
		italic:		{	name:				'Courier-Oblique',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			562,
						XHeight:			426,
						Ascender:			629,
						Descender:			-157,
						metrics:			{},
						kern:				null
			},
		bolditalic:	{	name:				'Courier-BoldOblique',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						CapHeight:			562,
						XHeight:			439,
						Ascender:			629,
						Descender:			-157,
						metrics:			{},
						kern:				null
			}
	},
	{	aliases:	['symbol'],
		metrics:	{32:250,33:333,34:713,35:500,36:549,37:833,38:778,39:439,40:333,41:333,42:500,43:549,44:250,45:549,46:250,47:278,48:500,49:500,50:500,51:500,52:500,53:500,54:500,55:500,56:500,57:500,58:278,59:278,60:549,61:549,62:549,63:444,64:549,65:722,66:667,67:722,68:612,69:611,70:763,71:603,72:722,73:333,74:631,75:722,76:686,77:889,78:722,79:722,80:768,81:741,82:556,83:592,84:611,85:690,86:439,87:768,88:645,89:795,90:611,91:333,92:863,93:333,94:658,95:500,96:500,97:631,98:549,99:549,100:494,101:439,102:521,103:411,104:603,105:329,106:603,107:549,108:549,109:576,110:521,111:549,112:549,113:521,114:549,115:603,116:439,117:576,118:713,119:686,120:493,121:686,122:494,123:480,124:200,125:480,126:549},
		normal:		{	name:				'Symbol',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			},
		bold:		{	name:				'Symbol',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			},
		italic:		{	name:				'Symbol',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			},
		bolditalic:	{	name:				'Symbol',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			}
	},
	{	aliases:	['zap dingbats','zap f dingbats','zapdingbats','zapfdingbats','dingbats','wingdings'],
		metrics:	{32:278,33:974,34:961,35:974,36:980,37:719,38:789,39:790,40:791,41:690,42:960,43:939,44:549,45:855,46:911,47:933,48:911,49:945,50:974,51:755,52:846,53:762,54:761,55:571,56:677,57:763,58:760,59:759,60:754,61:494,62:552,63:537,64:577,65:692,66:786,67:788,68:788,69:790,70:793,71:794,72:816,73:823,74:789,75:841,76:823,77:833,78:816,79:831,80:923,81:744,82:723,83:749,84:790,85:792,86:695,87:776,88:768,89:792,90:759,91:707,92:708,93:682,94:701,95:826,96:815,97:789,98:789,99:707,100:687,101:696,102:689,103:786,104:787,105:713,106:791,107:785,108:791,109:873,110:761,111:762,112:762,113:759,114:759,115:892,116:892,117:788,118:784,119:438,120:138,121:277,122:415,123:392,124:392,125:668,126:668,128:390},
		normal:		{	name:				'ZapfDingbats',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			},
		bold:		{	name:				'ZapfDingbats',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			},
		italic:		{	name:				'ZapfDingbats',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			},
		bolditalic:	{	name:				'ZapfDingbats',
						UnderlinePosition:	-100,
						UnderlineThickness:	50,
						metrics:			{},
						kern:				null
			}
	}
];

/* Private Methods */
//----------Helper Funcitons---------------------------
function CInt(v) {
	return (typeof(v) == "undefined" || v === null) ? null : parseInt(v,10);
}
function CStr(s) {
	if (typeof(s)  ==  "date") {
		return formatDate(s, "o/d/Y T");
	}
	if (typeof(s) == "undefined" || s === null) {
		return "";
	}
	return String(s);
}
function Round(v, dp) {
	var exp = parseInt(dp,10), pow = Math.pow(10, isNaN(exp) ? 0 : exp), n = parseFloat(v);
	return Math.round(n*pow)/pow;
}
function isDefined(v) {
	return typeof(v) != "undefined" && v !== null;
}
function isNumeric(v) {
	return isDefined(v) && !isNaN(parseFloat(v));
}
function isFoundIn(v, a) {
	var i;
	for (i = 0; i < a.length; i++) {
		if (v == a[i]) {
			return true;
		}
	}
	return false;
}
function buffer(separator) {
	var output = [];
	this.separator = separator || "\n";
	this.clear = function() {
		output = [];
	};
	this.length = function() {
		return output.length;
	};
	this.size = function() {
		var i, sz;
		for (sz = i = 0; i < output.length; i++) {
			sz += output[i].length;
		}
		if (output.length > 1) {
			sz += (separator.length * (output.length-1));
		}
		return sz;
	};
	this.add = function(s) {
		output[output.length] = s;
	};
	this.toString = function() {
		return output.join(this.separator);
	};
}
//-----------------------------------------------------
function getState() {
	return {
		foreColor: self.foreColor,
		fillColor: self.fillColor,
		fontFamily: self.fontFamily,
		fontSize: self.fontSize,
		fontBold: self.fontBold,
		fontItalic: self.fontItalic,
		lineWidth: self.lineWidth,
		lineStyle: self.lineStyle,
		lineEndStyle: self.lineEndStyle,
		lineJoinStyle: self.lineJoinStyle,
		fontAlignment: self.fontAlignment,
		kern: self.kern
	};
}
function setState(o) {
	self.foreColor = o.foreColor;
	self.fillColor = o.fillColor;
	self.fontFamily = o.fontFamily;
	self.fontSize = o.fontSize;
	self.fontBold = o.fontBold;
	self.fontItalic = o.fontItalic;
	self.lineWidth = o.lineWidth;
	self.lineStyle = o.lineStyle;
	self.lineEndStyle = o.lineEndStyle;
	self.lineJoinStyle = o.lineJoinStyle;
	self.fontAlignment = o.fontAlignment;
	self.kern = o.kern;
}
// Create an indirect object reference
function objRef(obj) {
	return obj + " 0 R";
}

// Convert an value from inches to PDF space (72 points/inch), don't apply any offsets
function mapV(v) {
	return v * 72;
}

// Convert an X value from real world (inches) to PDF (points)
function mapX(x) {
	return ((x >= 0 ? x : self.pageWidth + x) + (output[outputIndex].left >= 0 ? output[outputIndex].left : self.pageWidth + output[outputIndex].left)) * 72;
}

// Convert a Y value from real world (inches) to PDF (points)
// PDF sees the lower right corner of a page as 0,0 -- convert this to the upper left corner
function mapY(y) {
	return (self.pageHeight - (output[outputIndex].top >= 0 ? output[outputIndex].top : self.pageHeight + output[outputIndex].top) - (y >= 0 ? y : self.pageHeight + y)) * 72;
}

// Set the maximum Y extent on the page (for the current output buffer)
function setMaxY(y) {
	output[outputIndex].maxY = Math.max(output[outputIndex].maxY, y);
	return output[outputIndex].maxY;
}

// Create a font reference resource for all fonts available.
// This should really only add references for the fonts used -- Has to reference all fonts
function fontRef() {
	var i, x, a, s;
	
	s = "<<";
	for (i = 0; i < fonts.length; i++) {
		x = i*4;
		s += "/F" + x + " " + objRef(fontObjects[x]);
		s += "/F" + (x+1) + " " + objRef(fontObjects[x+1]);
		s += "/F" + (x+2) + " " + objRef(fontObjects[x+2]);
		s += "/F" + (x+3) + " " + objRef(fontObjects[x+3]);
	}
	return s + ">>\r\n";
}
// Create the resources reference for a page object (all fonts and images used on the page)
function resources() {
	var i, s, a=[], imageI=false;
	s = "/Resources <<\r\n\t/Font " + fontRef();
	for (i in self.images) {
		if (self.images.hasOwnProperty(i)) {
			if (self.images[i].xObject) {
				a.push("/" + i + " " + self.images[i].xObject + " 0 R");
			}
			imageI = imageI || isDefined(self.images[i].palette);
		}
	}
	if (a.length > 0) {
		s += "\t/ProcSet [/PDF" + (imageI ? " /ImageI" : "") + " /ImageC]\r\n\t/XObject <<" + a.join(" ") + ">>\r\n";
	}
	return s + ">>\r\n";
}
// Builds a stream from the data in the pdfText and pdfGraphics arrays.
// The stream is ready for being written into a page content object
function buildStream(ndx) {
	var i, s="";
	if (output[ndx].graphics.length > 0) {
		s += output[ndx].graphics.join("\r\n") + "\r\n";
	}
	if (output[ndx].text.length > 0) {
		s += "BT" + "\r\n";
		s += output[ndx].text.join("\r\n") + "\r\n";
		s += "ET" + "\r\n";
	}
	return s;
}

// Return array of indirect object references that make up the contents of this page
function contentsRef() {
	var i, a = [];
	for (i = O_FIRST; i <= O_LAST; i++) {
		if (output[i].obj) {
			a.push(objRef(output[i].obj));
		}
	}
	return a.length === 0 ? "[]" : a.length > 1 ? "[" + a.join(" ") + "]" : a.join(" ");
}
// Write out a string to the PDF file.
// Add the length of the outgoing string (plus the CRLF) to pdfN -- needed for the cross reference table we have to create.
function write(s) {
	fileOffset += s.length + 2;
	buf.add(s);
}
// Write out a string to the PDF file.
// Add the length of the outgoing string (plus the CRLF) to pdfN -- needed for the cross reference table we have to create.
function pdfObject(ndx, obj) {
	var x;
	
	if (isDefined(ndx)) {
		x = ndx;
	}
	else {
		objNo += 1;
		x = objNo;
	}
	pdfObjects[x] = fileOffset;
	write(x + " 0 obj\r\n<<\r\n" + obj + "\r\n>>\r\nendobj");
	return x;
}
// Format a numeric value for a PDF file
function fn(n) {
	return ""+Round(n, 3);
}
// Build the annotations section (hyperlinks) section
function annotations() {
	var i, j, a = [];
	for (i = O_FIRST; i <= O_LAST; i++) {
		for (j = 0; j < output[i].annotations.length; j++) {
			a.push(output[i].annotations[j]);
		}
	}
	if (a.length > 0) {
		objNo += 1;
		pdfObjects[objNo] = fileOffset;
		write(objNo + " 0 obj\r\n[\r\n" + a.join("\r\n") + "\r\n]\r\nendobj");
		return "\r\n/Annots " + objRef(objNo);
	}
	return "";
}
// Add an annotation (hyperlink) on the page
function annotation(obj) {
	output[outputIndex].annotations.push(objRef(obj));
}
// Because we have to know the length of the text object stream before we write them out
// We save the text in an array.  This routine calculates the length of all text strings
// Writes the header and then writes the text stream.
function writePage(obj) {
	var a, s, x, i, annots;

	self.emit("beforeWritePage", {pageNo:self.pageNo, pageWidth:self.pageWidth, pageHeight:self.pageHeight});
	annots = annotations();
	for (i = O_FIRST; i <= O_LAST; i++) {
		s = buildStream(i);
		if (s != "" || i == O_PAGE) {
			objNo += 1;
			pdfObjects[objNo] = fileOffset;
			write(objNo + " 0 obj\r\n<<\r\n/Length " + s.length + "\r\n>>\r\nstream\r\n" + s + "endstream\r\nendobj");
			output[i].obj = objNo;
			output[i].text = [];
			output[i].graphics = [];
			output[i].annotations = [];
			output[i].maxY = 0;
		}
	}

	// Only output the fonts on the first page
	if (pageRefs.length == 2) {
		for (i = 0; i < fonts.length; i++) {
			x = i*4;
			fontObjects[x] = pdfObject(null, "/Type/Font/Subtype/Type1\r\n/Name/F" + x + "\r\n/Encoding/MacRomanEncoding\r\n/BaseFont/" + fonts[i].normal.name);
			fontObjects[x+1] = pdfObject(null, "/Type/Font/Subtype/Type1\r\n/Name/F" + (x+1) + "\r\n/Encoding/MacRomanEncoding\r\n/BaseFont/" + fonts[i].bold.name);
			fontObjects[x+2] = pdfObject(null, "/Type/Font/Subtype/Type1\r\n/Name/F" + (x+2) + "\r\n/Encoding/MacRomanEncoding\r\n/BaseFont/" + fonts[i].italic.name);
			fontObjects[x+3] = pdfObject(null, "/Type/Font/Subtype/Type1\r\n/Name/F" + (x+3) + "\r\n/Encoding/MacRomanEncoding\r\n/BaseFont/" + fonts[i].bolditalic.name);
		}
	}
	pageRefs[pageRefs.length-1] = pdfObject(null, "/Parent " + objRef(pageTree) + "\r\n/Type/Page\r\n/MediaBox[0 0 " + fn(mapV(self.pageWidth)) + " " + fn(mapV(self.pageHeight)) + "]" + "\r\n" + resources() + "/Contents " + contentsRef() + annots);
	self.pageNo += 1;
}

// Takes either a 6 digit HTML hex color string or it's integer equivalent, converts to PDF color values
function pdfColor(color) {
	var a=[], c;

	c = typeof(color) == "string" ? parseInt(color.replace(/#/g, ""), 16) : CInt(color);

	a[0] = CInt(c / 0x10000);
	a[1] = CInt((c & 0xff00) / 0x100);
	a[2] = CInt(c & 0xff);
	return a;
}

// Takes a color array and builds the PDF color command (RG or rg)
function pdfColorCommand(color, command) {
	return fn(color[0]/256) + " " + fn(color[1]/256) + " " + fn(color[2]/256) + " " + command;
}
// Look up the font name and parameters (bold/italic) and select the PDF font index
function selectFont(fontFamily, fontBold, fontItalic) {
	var i, j, fnt;
	var fFamily = fontFamily || self.fontFamily;
	var fBold = fontBold || self.fontBold;
	var fItalic = fontItalic || self.fontItalic;

	fnt = String(fFamily).toLowerCase();
	for (i = 0; i < fonts.length; i++) {
		for (j = 0; j < fonts[i].aliases.length; j++) {
			if (fnt == fonts[i].aliases[j] || fnt == fonts[i].aliases[j].replace(/ +/g, "")) {
				return (i * 4) + (fBold ? 1 : 0) + (fItalic ? 2 : 0);
			}
		}
	}
	return 1;		// Default font is Times Roman
}
// Get all information about a font and font family
function getFont(fontFamily, fontBold, fontItalic, fontSize) {
	var obj = {index: 0, fontFamily: fontFamily || self.fontFamily, fontBold: fontBold || self.fontBold, fontItalic: fontItalic || self.fontItalic, fontSize: fontSize || self.fontSize, kern: self.kern};

	obj.index = selectFont(obj.fontFamily);
	obj.family = fonts[CInt(obj.index/4)];
	obj.font = obj.family[obj.fontBold ? obj.fontItalic ? "bolditalic" : "bold" : obj.fontItalic ? "italic" : "normal"];
	obj.UnderlinePosition =	(obj.font.UnderlinePosition * (obj.fontSize/72)) / 1000;
	obj.UnderlineThickness = obj.font.UnderlineThickness;
	obj.CapHeight =			(obj.font.CapHeight * (obj.fontSize/72)) / 1000;
	obj.XHeight =			(obj.font.XHeight * (obj.fontSize/72)) / 1000;
	obj.Ascender =			(obj.font.Ascender * (obj.fontSize/72)) / 1000;
	obj.Descender =			(obj.font.Descender * (obj.fontSize/72)) / 1000;
	return obj;
}

// Generate a unique identifier for this PDF
function pdfIdentifier() {
	var i, s1, s2, d;

	//First ident string -- 10 random values and 'lattice'
	// First Start with 10 Random Hex values
	s1 = "";
	for (i = 0; i < 10; i++) {
		s1 += ('0'+parseInt(Math.random()*256, 10).toString(16)).slice(-2);
	}
	s1 += "4C617474696365";		// Hex for 'Lattice'

	//Second ident string (year, day of year, week of year, month, hour, minute, second) + 10 random values
	s2 = "";
	d = new Date();
	s2  = ('0'+parseInt(formatDate(d, "y"), 10).toString(16)).slice(-2);
	s2 += ('0'+parseInt(formatDate(d, "m"), 10).toString(16)).slice(-2);
	s2 += ('0'+parseInt(formatDate(d, "d"), 10).toString(16)).slice(-2);
	s2 += ('0'+parseInt(formatDate(d, "h"), 10).toString(16)).slice(-2);
	s2 += ('0'+parseInt(formatDate(d, "n"), 10).toString(16)).slice(-2);
	s2 += ('0'+parseInt(formatDate(d, "s"), 10).toString(16)).slice(-2);
	for (i1 = 0; i1 < 10; i1++) {
		s2 += ('0'+parseInt(Math.random()*256, 10).toString(16)).slice(-2);
	}
	return "<" + s1.toUpperCase() + "><" + s2.toUpperCase() + ">";
}
function getLineStyle(style) {
	return ["[]",			// 0 = LINE_SOLID
			"[3]",			// 1 = LINE_DASH
			"[1 3]",		// 2 = LINE_DOT
			"[3 3 1 3]",	// 3 = LINE_DASHDOT
			"[3 3 1 3 1 3]",// 4 = LINE_DASHDOTDOT
			"[]",			// 5 = LINE_INVISIBLE -- don't do invisible
			"[]"			// 6 = LINE_INSIDESOLID
	][Math.max(Math.min(6, style), 0)] + " 0 d";
}
// return font index
function xFont(fontFamily, fontBold, fontItalic) {
	var fontIndex = selectFont(fontFamily, fontBold, fontItalic);
	if (fontIndex !== pdfState.fontIndex) {
		pdfState.fontIndex = fontIndex;
		return "/F" + fontIndex + " 1 Tf\r\n";
	}
	return "";
}
// return line parameters
function xLineParameters(lineWidth, lineStyle) {
	var lw = isDefined(lineWidth) ? lineWidth : self.lineWidth, ls = lineStyle || self.lineStyle;
	if (lw !== pdfState.lineWidth || ls !== pdfState.lineStyle || self.lineEndStyle !== pdfState.lineEndStyle) {
		pdfState.lineWidth = lw;
		pdfState.lineStyle = ls;
		pdfState.lineEndStyle = self.lineEndStyle;
		return self.lineEndStyle + " J " + getLineStyle(ls) + " " + lw + " w\r\n";
	}
	return "";
}
// return line color
function xLineColor(lineColor) {
	var lc = lineColor || self.lineColor;
	if (lc !== pdfState.lineColor) {
		pdfState.lineColor = lc;
		return pdfColorCommand(pdfColor(lc), "RG") + "\r\n";
	}
	return "";
}
function xForeColor(foreColor) {
	var fc = foreColor || self.foreColor;
	if (fc !== pdfState.foreColor) {
		pdfState.foreColor = fc;
		return pdfColorCommand(pdfColor(fc), "rg") + "\r\n";
	}
	return "";
}
function xFillColor(fillColor) {
	var fc = fillColor || self.fillColor;
	if (fc !== pdfState.fillColor) {
		pdfState.fillColor = pdfState.foreColor = fc;
		return pdfColorCommand(pdfColor(fc), "rg") + "\r\n";
	}
	return "";
}
function breakStr(s, width, fixedWidth) {
	var i, j, t;
	fixedWidth = fixedWidth || 0;
	for (i = s.length-2; i >= 0; i--) {
		t = s.slice(0, i);
		if (fixedWidth + self.textWidth(t) < width) {
			if (s.charAt(i) !== " ") {
				j = Math.max(Math.max(t.lastIndexOf(" "), t.lastIndexOf("-")), t.lastIndexOf("/"));
				j = j >= 0 ? j+1 : i;
			}
			else {
				j = i;
			}
			return [s.trim().slice(0, j), s.trim().slice(0,-j)];
		}
	}
	return [s, ""];
}
// Add item to page
function add(type, contents) {
	if (type == TEXT) {
		output[outputIndex].text.push(contents);
	}
	else {
		output[outputIndex].graphics.push(contents);
	}
}
function toBigInteger() {
	var i, v=0, p=1;
	for (i = 0; i < arguments.length; i++) {
		v += (arguments[i] * p);
		p *= 256;
	}
	return v;
}
function flatten(d) {
	var i, j, a=[];
	if (isDefined(d[0].r)) {
		for (i = 0; i < d.length; i++) {
			a.push(d[i].r);
			a.push(d[i].g);
			a.push(d[i].b);
		}
	}
	else if (isDefined(d[0][0])) {
		if (isDefined(d[0][0].r)) {
			for (i = 0; i < d.length; i++) {
				for (j = 0; j < d[i].length; j++) {
					a.push(d[i][j].r);
					a.push(d[i][j].g);
					a.push(d[i][j].b);
				}
			}
		}
		else {
			for (i = 0; i < d.length; i++) {
				for (j = 0; j < d[i].length; j++) {
					a.push(d[i][j]);
				}
			}
		}
	}
	else {
		a = d;
	}
	return a;
}
function packBytes(data, bits) {
	var i, v, a=[];
	if (bits == 4) {
		for (i = 0; i < data.length; i++) {
			if (i % 2 == 1) {
				a.push(v + data[i]);
			}
			else {
				v = data[i] * 16;
			}
		}
		if ((i % 2) !== 0) {
			a.push(v);
		}
		return a;
	}
	else if (bits == 2) {		// Not sure if this one is used
		for (i = 0; i < data.length; i++) {
			if (i % 4 == 3) {
				a.push((v*4) + data[i]);
				v = 0;
			}
			else {
				v = (v*4) + data[i];
			}
		}
		if ((i % 4) !== 0) {
			a.push(v*4);
		}
		return a;
	}
	else if (bits == 1) {
		for (v = i = 0; i < data.length; i++) {
			if (i % 8 == 7) {
				a.push((v*2) + data[i]);
				v = 0;
			}
			else {
				v = (v*2) + data[i];
			}
		}
		if ((i % 8) !== 0) {
			a.push(v*2);
		}
		return a;
	}
	else {
		return data;
	}
}
function runLengthEncode(d) {
	var i, j, k, a=[], v, anchor;
	function doLiteral(start, end) {
		var i, j, x;
		i = start;
		while (i <= end) {
			x = a.length;
			a.push(0);
			for (j = 0; j < 127 && i+j <= end; j++) {
				a.push(d[i+j]);
			}
			a[x] = j-1;
			i += 127;
		}
	}
	i = anchor = 0;
	while (i < d.length) {
		if (d.length-i > 1 && d[i] == d[i+1]) {		// Figure out how long this run is (3-128)
			if (anchor < i) {
				doLiteral(anchor, i-1);
			}
			j = i+2;
			while (d[i] == d[j] && j < d.length) {
				j += 1;
			}
			k = j - i;
			while (k > 0) {
				a.push(257 - (k > 128 ? k == 129 ? 127 : 128 : k));
				a.push(d[i]);
				k -= (k == 129 ? 127 : 128);
			}
			anchor = j;
			i = j-1;
		}
		i += 1;
	}
	if (anchor < d.length-1) {
		doLiteral(anchor, d.length-1);
	}
	a.push(128);
	return a;
}
function toAscii85(data) {
	var i, j, x, s, a=[];
	for (i = 0; i < data.length; i += 4) {
		x = toBigInteger(data[i+3] || 0, data[i+2] || 0, data[i+1] || 0, data[i]);
		for (s = "", j = 0; j < 5; j++) {
			s = String.fromCharCode(33 + (x % 85)) + s;
			x = CInt(x/85);
		}
		if (data.length - i < 4) {
			s = s.slice(0, (data.length - i) + 1);
		}
		else {
			s = s == "!!!!!" ? "z" : s;
		}
		a.push(s);
	}
	return a.join("");
}
// Doesn't work right on last group if less than 5
// Need to pad out the group with '!' (I think) -- since this routine isn't
// really needed, I'm not fixing it.
function fromAscii85(str) {
	var a = [], b, i, j, v, s = str.replace(/\s+/,"");
	for (i = 0; i < s.length; i++) {
		if (s.charAt(i) == "z") {
			a.push(0); a.push(0); a.push(0); a.push(0);
		}
		else {
			v = 0;
			k = s.length - i < 5 ? s.length - i : 5;
			for (j = 0; j < k; j++) {
				v = (v * 85) + (s.charCodeAt(i+j)-33);
			}
			for (b=[], j = 0; j < (k-1); j++) {
				b[j] = v % 256;
				v = CInt(v / 256);
			}
			for (j = k-2; j >= 0; j--) {
				a.push(b[j]);
			}
			i += (k-1);
		}
	}
	return a;
}
function getBitmap(path) {
	var data, bmp = null, i, j, k, x, lnbl, rnbl;
	var INCHES_PER_METER = 39.3700787;
	var fs = require("fs");

	data = fs.readFileSync(path);

	if (data !== null) {
		bmp = {};
		if (data[0] == 66/*B*/ && data[1] == 77/*M*/) {
			bmp.fileSize = toBigInteger(data[2], data[3], data[4], data[5]);
			bmp.dataOffset = toBigInteger(data[10], data[11], data[12], data[13]);
			bmp.infoSize = toBigInteger(data[14], data[15], data[16], data[17]);
			bmp.width = toBigInteger(data[18], data[19], data[20], data[21]);
			bmp.height = toBigInteger(data[22], data[23], data[24], data[25]);
			bmp.bitsPerPixel = toBigInteger(data[28], data[29]);
			bmp.compression = toBigInteger(data[30], data[31], data[32], data[33]);
			// convert pixels per meter to dots per inch
			bmp.dpiHoriz = (toBigInteger(data[38], data[39], data[40], data[41]) / INCHES_PER_METER) || 72;
			bmp.dpiVert = (toBigInteger(data[42], data[43], data[44], data[45]) / INCHES_PER_METER) || 72;
			bmp.colorCount = toBigInteger(data[46], data[47], data[48], data[49]);
			// Color count isn't always set in the header, so it's better to calculate it.
			// Since it sits between the end of the header and the start of the data, if there
			// is a gap there, then we have a color table
			if ((bmp.infoSize+14) < bmp.dataOffset) {	// If these 2 don't equal, then we have a color table
				bmp.colorCount = (bmp.dataOffset - (bmp.infoSize+14)) / 4;
				bmp.palette=[];
				k = 14 + bmp.infoSize;
				for (i = 0; i < bmp.colorCount; i++) {
					bmp.palette[i] = {b: data[k+(i*4)], g: data[k+1+(i*4)], r: data[k+2+(i*4)]};
				}
			}
			// Uncompress (if RLE encoded)
			if (bmp.compression === 0/*no compression*/) {
				bmp.raw = data.slice(bmp.dataOffset);
			}
			else if (bmp.compression == 1/*8-bit RLE*/ || bmp.compression == 2/*4-bit RLE*/) {
				bmp.raw = [];
				i = bmp.dataOffset;
				while (i < bmp.fileSize) {
					if (data[i] === 0) {
						if (data[i+1] === 0 || data[i+1] == 1) {		// End of scan line (or end of data)
							//Pad the raw data to a 4-byte boundary
							while (bmp.raw.length % 4) {
								bmp.raw[bmp.raw.length] = 0;
							}
							if (data[i+1] == 1) {
								break;
							}
						}
						else if (data[i+1] == 2) {	// Run offset marker (not supported)
							throw new Error("Don't understand run offset markers in RLE data");
						}
						else if (bmp.compression == 1/*8-bit RLE*/) {						// Un-encoded run
							for (j = 0; j < data[i+1]; j++) {
								bmp.raw[bmp.raw.length] = data[i+2+j];
							}
							i += CInt((data[i+1]+1)/2)*2;
						}
						else /*4-bit RLE*/ {
							for (j = 0; j < data[i+1]; j++) {
								x = data[i+2+CInt(j/2)];
								if ((j % 2) === 0) {
									bmp.raw[bmp.raw.length] = x & 0xf0;
								}
								else {
									bmp.raw[bmp.raw.length-1] |= x & 0x0f;
								}
							}
							i += CInt(((data[i+1]/2)+1)/2)*2;
						}
					}
					else if (bmp.compression == 1/*8-bit RLE*/) {
						for (j = 0; j < data[i]; j++) {
							bmp.raw[bmp.raw.length] = data[i+1];
						}
					}
					else /*4-bit RLE*/ {
						lnbl = data[i+1] & 0xf0;
						rnbl = data[i+1] & 0x0f;
						for (j = 0; j < data[i]; j++) {
							if ((j % 2) === 0) {
								bmp.raw[bmp.raw.length] = lnbl;
							}
							else {
								bmp.raw[bmp.raw.length-1] |= rnbl;
							}
						}
					}
					i += 2;
				}
			}
			else {
				throw new Error("Unknown compression method = " + bmp.compression);
			}
		}
		else {
			throw new Error("Invalid BMP File");
		}
	}
	else {
		throw new Error("Error reading file");
	}
	return bmp;
}
function getBitmapData(bmp) {
	var data=[], i, j, k=0;
	if (bmp.bitsPerPixel == 24) {
		for (i = 0; i < bmp.height; i++) {
			data[i] = [];
			for (j = 0; j < bmp.width; j++) {
				data[i][j] = {b: bmp.raw[k+(j*3)], g: bmp.raw[k+1+(j*3)], r: bmp.raw[k+2+(j*3)]};
			}
			k += CInt(((bmp.width*3)+3)/4)*4;
		}
	}
	else if (bmp.bitsPerPixel == 8) {
		for (i = 0; i < bmp.height; i++) {
			data[i] = [];
			for (j = 0; j < bmp.width; j++) {
				data[i][j] = bmp.raw[k+j];
			}
			k += CInt(((bmp.width)+3)/4)*4;
		}
	}
	else if (bmp.bitsPerPixel == 4) {
		for (i = 0; i < bmp.height; i++) {
			data[i] = [];
			for (j = 0; j < bmp.width; j++) {
				x = (j % 2) === 0 ? 16 : 1;
				data[i][j] = CInt(bmp.raw[k+CInt(j/2)] / x) & 0xf;
			}
			k += CInt(CInt((bmp.width/2)+3.9)/4)*4;
		}
	}
	else if (bmp.bitsPerPixel == 1) {
		for (i = 0; i < bmp.height; i++) {
			data[i] = [];
			for (j = 0; j < bmp.width; j++) {
				x = 1 << (7-(j % 8));
				data[i][j] = bmp.raw[k+CInt(j/8)] & x ? 1 : 0;
			}
			k += CInt(CInt((bmp.width/8)+3.9)/4)*4;
		}
	}
	else {
		throw new Error("Invalid # of bits per pixel");
	}
	data.reverse();
	return data;
}

// Put image objects onto the page
function genImageObjects(name) {
	var k, s, img = self.images[name];
	if (img) {
		if (img.paletteLength > 0) {		// Define the colorspace
			objNo += 1;
			k = objNo;
			pdfObjects[objNo] = fileOffset;
			write(objNo + " 0 obj\r\n<< /Length " + (img.ascii85ColorSpace.length+2) + "\r\n/Filter [/ASCII85Decode /RunLengthDecode]\r\n>>\r\nstream\r\n" + img.ascii85ColorSpace + "~>\r\nendstream\r\nendobj");
			img.colorSpace = "[ /Indexed /DeviceRGB " + (img.paletteLength-1) + " " + k + " 0 R ]";
		}
		else {
			img.colorSpace = "/DeviceRGB";
		}
		s = "<<  /Type /XObject\r\n" +
			"    /Subtype /Image\r\n" +
			"    /Name /" + name + "\r\n" +
			"    /Width " + img.width + "\r\n" +
			"    /Height " + img.height + "\r\n" +
			"    /ColorSpace " + img.colorSpace + "\r\n" +
			"    /BitsPerComponent " + img.bitsPerComponent + "\r\n" +
			"    /Length " + (img.ascii85Data.length+2) + "\r\n" +
			"    /Filter [/ASCII85Decode /RunLengthDecode]\r\n" +
			">>\r\n" +
			"stream\r\n" +
			img.ascii85Data + "~>\r\n" +
			"endstream\r\n";
		objNo += 1;
		img.xObject = objNo;
		pdfObjects[objNo] = fileOffset;
		write(objNo + " 0 obj\r\n" + s + "endobj");
	}
}
// make objects to support an annotation (hyperlink)
function mkLink(x, y, kt, href, foreColor) {
	var uri, rect, ascender, descender;
	ascender = y-kt.Ascender;
	descender = y-kt.Descender;
	uri = pdfObject(null, "/Type /Action\r\n/S /URI\r\n/URI (" + href + ")");
	rect = pdfObject(null, "/Type /Annot\r\n/Subtype /Link\r\n/A " + objRef(uri) + "\r\n/Rect [ " + fn(mapX(x)) + " " + fn(mapY(ascender)) + " " + fn(mapX(x+kt.textWidth)) + " " + fn(mapY(descender)) + " ]\r\n/Border [ 10 10 10 60 ]");
	annotation(rect);
	self.hLine(x, y-kt.UnderlinePosition, kt.textWidth, foreColor, kt.UnderlineThickness/72, self.LINE_SOLID);
}
// cache widths for all the provided words
function cacheTextWidths(str, font, fontSize, fontFamily, fontBold, fontItalic) {
	var i, ci, wc, words = typeof(str)=="object" && str.slice ? str : str.split(" ");
	font = font || getFont(fontFamily, fontBold, fontItalic, fontSize);
	if (!font.font.widthCache) {
		font.font.widthCache = {};
	}
	ci = font.fontSize.toString() + (font.kern ? "K" : "k");
	wc = font.font.widthCache[ci];
	if (!wc) {
		wc = font.font.widthCache[ci] = {};
		wc[""] = 0;
		wc[" "] = self.textWidth(" ", font.fontSize, font.fontFamily, font.fontBold, font.fontItalic);
	}
	for (i = 0; i < words.length; i++) {
		if (!wc[words[i]]) {
			wc[words[i]] = self.textWidth(words[i], font.fontSize, font.fontFamily, font.fontBold, font.fontItalic);
		}
	}
	return wc;
}

function lattice(orientation) {
	self = this;
	events.EventEmitter.call(this);
	self.version = "0.2.0";

	// Fill Types
	self.FILL_SOLID = 0;
	self.FILL_TRANSPARENT = 1;
	self.FILL_HORIZLINE = 2;
	self.FILL_VERTLINE = 3;
	self.FILL_UPDIAG = 4;
	self.FILL_DOWNDIAG = 5;
	self.FILL_CROSS = 6;
	self.FILL_DIAGCROSS = 7;

	// Line Types
	self.LINE_SOLID = 0;
	self.LINE_DASH = 1;
	self.LINE_DOT = 2;
	self.LINE_DASHDOT = 3;
	self.LINE_DASHDOTDOT = 4;
	self.LINE_INVISIBLE = 5;
	self.LINE_INSIDESOLID = 6;

	// Line End Styles
	self.LINEEND_BUTT = 0;
	self.LINEEND_CAP = 1;
	self.LINEEND_PROJECTING_SQUARE = 2;

	// Line Join Styles
	self.LINEJOIN_MITER = 0;
	self.LINEJOIN_ROUND = 1;
	self.LINEJOIN_BEVEL = 2;

	// Page Style
	self.PORTRAIT = 1;
	self.LANDSCAPE = 2;

	// Alignment
	self.ALIGN_LEFT = "L";
	self.ALIGN_RIGHT = "R";
	self.ALIGN_CENTER = "C";

	// Font Alignment
	self.BASELINE = 0;
	self.ASCENDER = 1;
	self.CAPHEIGHT = 2;
}
sys.inherits(lattice, events.EventEmitter);
exports.lattice = lattice;

/* Public Methods */
lattice.prototype.begin = function(orientation) {
	buf = new buffer("\r\n");
	finished = false;
	self.pageNo = 1;
	self.pageLeftOffset = self.pageTopOffset = 0;
	self.pageOrientation = orientation == self.LANDSCAPE ? self.LANDSCAPE : self.PORTRAIT;
	self.pageWidth = self.pageOrientation  == self.LANDSCAPE ? 11 : 8.5;
	self.pageHeight = self.pageOrientation == self.LANDSCAPE ? 8.5 : 11;
	outputIndex = O_PAGE;
	output[O_PAGE] = {text:[], graphics:[], annotations:[], obj: objNo, top: self.pageTopOffset, left: self.pageLeftOffset, maxY: 0};
	output[O_HEADER] = {text:[], graphics:[], annotations:[], top: 0, left:0, maxY: 0};
	output[O_FOOTER] = {text:[], graphics:[], annotations:[], top: 0, left:0, maxY: 0};
	output[O_WATERMARK] = {text:[], graphics:[], annotations:[], top: 0, left:0, maxY: 0};
	fileOffset = 0;
	self.foreColor = self.lineColor = "000000";
	self.fillColor = "ffffff";
	self.fontSize = 12;
	self.fontBold = false;
	self.fontItalic = false;
	self.lineWidth = 1;
	self.lineStyle = 0;
	self.lineEndStyle = self.LINEEND_BUTT;
	self.lineJoinStyle = self.LINEJOIN_MITER;
	self.fontAlignment = self.BASELINE;
	self.fontFamily = "Times New Roman";
	self.images = {};
	self.kern = true;
	// Reserve object 0 for the Page Tree - can't be output till the document is ended
	// Reserve object 1 for the content of page #1
	pageRefs = [null,null];
	pageTree = 1;
	pdfObjects = [null,null];
	objNo = 1;
	write("%PDF-1.3");
};
  /**
   * Initialize the pdf engine
   *
   * @param {Number} pageOrientation PORTRAIT or LANDSCAPE, defaults to PORTRAIT
   */
lattice.prototype.setColor = function(foreColor, fillColor) {
	if (isDefined(foreColor)) {
		self.foreColor = foreColor;
	}
	if (isDefined(fillColor)) {
		self.fillColor = fillColor;
	}
};
lattice.prototype.setLine = function(lineColor, lineStyle, lineWidth, lineEndStyle, lineJoinStyle) {
	if (isDefined(lineColor)) {
		self.lineColor = lineColor;
	}
	if (isDefined(lineStyle)) {
		self.lineStyle = lineStyle;
	}
	if (isDefined(lineWidth)) {
		self.lineWidth = lineWidth;
	}
	if (isDefined(lineEndStyle)) {
		self.lineEndStyle = lineEndStyle;
	}
	if (isDefined(lineJoinStyle)) {
		self.lineJoinStyle = lineJoinStyle;
	}
};
lattice.prototype.setFont = function(fontSize, fontFamily, fontBold, fontItalic, foreColor) {
	if (isDefined(fontFamily)) {
		self.fontFamily = fontFamily;
	}
	if (isDefined(fontSize)) {
		self.fontSize = fontSize;
	}
	if (isDefined(fontBold)) {
		self.fontBold = fontBold;
	}
	if (isDefined(fontItalic)) {
		self.fontItalic = fontItalic;
	}
	if (isDefined(foreColor)) {
		self.foreColor = foreColor;
	}
};
lattice.prototype.line = function(x1, y1, x2, y2, lineColor, lineWidth, lineStyle) {
	setMaxY(Math.max(y1,y2));
	add(GRAPHICS, 
			xLineParameters(lineWidth, lineStyle) +
			xLineColor(lineColor) +
			fn(mapX(x1)) + " " + fn(mapY(y1)) + " m" + "\r\n" +
			fn(mapX(x2)) + " " + fn(mapY(y2)) + " l" + "\r\n" +
			"S");
};
lattice.prototype.vLine = function(x, y, length, lineColor, lineWidth, lineStyle) {
	setMaxY(y+length);
	add(GRAPHICS, 
			xLineParameters(lineWidth, lineStyle) +
			xLineColor(lineColor) +
			fn(mapX(x)) + " " + fn(mapY(y)) + " m" + "\r\n" +
			fn(mapX(x)) + " " + fn(mapY(y+length)) + " l" + "\r\n" +
			"S");
};
lattice.prototype.hLine = function(x, y, length, lineColor, lineWidth, lineStyle) {
	setMaxY(y);
	add(GRAPHICS, 
			xLineParameters(lineWidth, lineStyle) +
			xLineColor(lineColor) +
			fn(mapX(x)) + " " + fn(mapY(y)) + " m" + "\r\n" +
			fn(mapX(x+length)) + " " + fn(mapY(y)) + " l" + "\r\n" +
			"S");
};
/*
 * See http://www.whizkidtech.redprince.net/bezier/circle/kappa/
 * from that article, kappa = 0.5522847498
 */
lattice.prototype.circle = function(x, y, r, lineColor, fillColor, lineWidth, lineStyle) {
	var kappa = ((Math.sqrt(2)-1) / 3) * 4;
	setMaxY(y+r);
	add(GRAPHICS,
			xLineParameters(lineWidth, lineStyle) +
			xLineColor(lineColor) +
			fn(mapX(x-r)) + " " + fn(mapY(y)) + " m" + "\r\n" +
			fn(mapX(x-r)) + " " + fn(mapY(y-(r*kappa))) + " " + fn(mapX(x-(r*kappa))) + " " + fn(mapY(y-r)) + " " + fn(mapX(x)) + " " + fn(mapY(y-r)) + " c" + "\r\n" +
			fn(mapX(x+(r*kappa))) + " " + fn(mapY(y-r)) + " " + fn(mapX(x+r)) + " " + fn(mapY(y-(r*kappa))) + " " + fn(mapX(x+r)) + " " + fn(mapY(y)) + " c" + "\r\n" +
			fn(mapX(x+r)) + " " + fn(mapY(y+(r*kappa))) + " " + fn(mapX(x+(r*kappa))) + " " + fn(mapY(y+r)) + " " + fn(mapX(x)) + " " + fn(mapY(y+r)) + " c" + "\r\n" +
			fn(mapX(x-(r*kappa))) + " " + fn(mapY(y+r)) + " " + fn(mapX(x-r)) + " " + fn(mapY(y+(r*kappa))) + " " + fn(mapX(x-r)) + " " + fn(mapY(y)) + " c" + "\r\n" +
			"s");
	if (isDefined(fillColor)) {
		add(GRAPHICS,
				xFillColor(fillColor) +
				fn(mapX(x-r)) + " " + fn(mapY(y)) + " m" + "\r\n" +
				fn(mapX(x-r)) + " " + fn(mapY(y-(r*kappa))) + " " + fn(mapX(x-(r*kappa))) + " " + fn(mapY(y-r)) + " " + fn(mapX(x)) + " " + fn(mapY(y-r)) + " c" + "\r\n" +
				fn(mapX(x+(r*kappa))) + " " + fn(mapY(y-r)) + " " + fn(mapX(x+r)) + " " + fn(mapY(y-(r*kappa))) + " " + fn(mapX(x+r)) + " " + fn(mapY(y)) + " c" + "\r\n" +
				fn(mapX(x+r)) + " " + fn(mapY(y+(r*kappa))) + " " + fn(mapX(x+(r*kappa))) + " " + fn(mapY(y+r)) + " " + fn(mapX(x)) + " " + fn(mapY(y+r)) + " c" + "\r\n" +
				fn(mapX(x-(r*kappa))) + " " + fn(mapY(y+r)) + " " + fn(mapX(x-r)) + " " + fn(mapY(y+(r*kappa))) + " " + fn(mapX(x-r)) + " " + fn(mapY(y)) + " c" + "\r\n" +
				"f*");
	}
};
lattice.prototype.rectangle = function(x, y, width, height, lineColor, fillColor, lineWidth, lineStyle) {
	setMaxY(y+height);
	if (isDefined(fillColor)) {
		add(GRAPHICS, 
				xFillColor(fillColor) +
				xLineParameters(lineWidth, lineStyle) +
				xLineColor(lineColor) +
				fn(mapX(x)) + " " + fn(mapY(y)) + " m" + "\r\n" +
				fn(mapX(x)) + " " + fn(mapY(y+height)) + " l" + "\r\n" +
				fn(mapX(x+width)) + " " + fn(mapY(y+height)) + " l" + "\r\n" +
				fn(mapX(x+width)) + " " + fn(mapY(y)) + " l" + "\r\n" +
				"h B");
	}
	else {
		add(GRAPHICS, 
				xLineParameters(lineWidth, lineStyle) +
				xLineColor(lineColor) +
				fn(mapX(x)) + " " + fn(mapY(y)) + " m" + "\r\n" +
				fn(mapX(x)) + " " + fn(mapY(y+height)) + " l" + "\r\n" +
				fn(mapX(x+width)) + " " + fn(mapY(y+height)) + " l" + "\r\n" +
				fn(mapX(x+width)) + " " + fn(mapY(y)) + " l" + "\r\n" +
				"h\r\ns");
	}
};
lattice.prototype.grid = function(x, y, cols, colWidth, rows, rowHeight, lineColor) {
	var i;
	setMaxY(y + (rows*rowHeight));
	for (i = 0; i <= cols; i++) {
		self.vLine(x + (i*colWidth), y, rowHeight * rows, lineColor);
	}
	for (i = 0; i <= rows; i++) {
		self.hLine(x, y+(i*rowHeight), colWidth * cols, lineColor);
	}
};
lattice.prototype.wordWrap = function(width, height, str, fontSize, fontFamily, fontBold, fontItalic) {
	var a, b, c, i, j, s, t, tw, ww, xw, wc, fSize = fontSize || self.fontSize;
	var font, words, spaceWidth;

	if (isNaN(parseFloat(width)) || width <= 0) {
		throw new Error("lattice.wordWrap: width must be a positive number, value = " + width);
	}
	a = CStr(str).replace(/\r/g,"").replace(/\n$/,"").split("\n");
	b = [];
	font = getFont(fontFamily, fontBold, fontItalic, fontSize);
	for (i = 0; i < a.length; i++) {
		tw = self.textWidth(a[i], fontSize, fontFamily, fontBold, fontItalic);
		if (tw > width) {
			s = a[i];
			words = s.split(" ");
			wc = cacheTextWidths(words, font);
			spaceWidth = wc[" "];
			c = "";
			tw = 0;
			for (j = 0; j < words.length; j++) {
				ww = (j > 0 ? spaceWidth : 0) + wc[words[j]];
				if (tw + ww < width) {
					c += (j > 0 ? " " : "") + words[j];
					tw += ww;
				}
				else if (wc[words[j]] > width) {
					if (c != "") {
						b.push(c);
					}
					s = words[j];
					tw = self.textWidth(s, fontSize, fontFamily, fontBold, fontItalic);
					while (tw > width) {
						c = breakStr(s, width);
						b.push(c[0]);
						s = c[1];
						tw = self.textWidth(s, fontSize, fontFamily, fontBold, fontItalic);
					}
					if (s != "") {
						b.push(s);
					}
					c = "";
				}
				else {
					b.push(c);
					c = words[j];
					tw = wc[words[j]];
				}
			}
			if (c != "") {
				b.push(c);
			}
		}
		else {
			b.push(a[i]);
		}
	}
	return b;
};
lattice.prototype.textWrap = function(x, y, width, height, str, align, fontSize, fontFamily, fontBold, fontItalic, foreColor, href) {
	var a, i, h = 0, fSize = fontSize || self.fontSize;
	if (str && typeof(str)=="object") {
		a = str;
	}
	else {
		a = self.wordWrap(width, height, str, fontSize, fontFamily, fontBold, fontItalic, foreColor);
	}
	for (i = 0; i < a.length; i++) {
		if (align.toUpperCase() == self.ALIGN_CENTER) {
			self.textCenter(x, y + h, width, a[i], fontSize, fontFamily, fontBold, fontItalic, foreColor, href);
		}
		else if (align.toUpperCase() == self.ALIGN_RIGHT) {
			self.textRight(x, y + h, width, a[i], fontSize, fontFamily, fontBold, fontItalic, foreColor, href);
		}
		else {
			self.text(x, y + h, a[i], fontSize, fontFamily, fontBold, fontItalic, foreColor, href);
		}
		h += ((fSize*1.12)/72);
	}
	return h;
};
lattice.prototype.textWidth = function(text, fontSize, fontFamily, fontBold, fontItalic) {
	var i, tw, kw, c, c1, v, s, kern, font, str = CStr(text);
	var fSize = fontSize || self.fontSize;
	var fFamily = fontFamily || self.fontFamily;
	var fBold = fontBold || self.fontBold;
	var fItalic = fontItalic || self.fontItalic;
	if (str.length > 0) {
		font = getFont(fFamily, fBold, fItalic);
		kern = self.kern && font.font.kern;
		for (i = tw = kw = 0; i < str.length; i++) {
			c = str.charAt(i);
			v = str.charCodeAt(i);
			if (isDefined(font.font.metrics[v])) {
				tw += font.font.metrics[v];
			}
			else if (isDefined(font.family.metrics[v])) {
				tw += font.family.metrics[v];
			}
			// Kerning
			if (kern && i < (str.length-1)) {
				c1 = str.charAt(i+1);
				if (isDefined(font.font.kern[c]) && isDefined(font.font.kern[c][c1])) {
					kw += font.font.kern[c][c1];
				}
			}
		}
		return ((tw-kw) * (fSize/72)) / 1000;
	}
	return 0;
};
lattice.prototype.kernText = function(text, fontSize, fontFamily, fontBold, fontItalic) {
	var i, k, tw, kw, c, c1, v, s, font, str = CStr(text);
	var r = {	str:		"()",
				totalKern:	0,
				width:		0,
				textWidth:	0,
				fontSize:	fontSize || self.fontSize,
				fontFamily:	fontFamily || self.fontFamily,
				fontBold:	fontBold || self.fontBold,
				fontItalic:	fontItalic || self.fontItalic
	};
	
	if (str.length > 0) {
		r.str = "(";
		font = getFont(r.fontFamily, r.fontBold, r.fontItalic, r.fontSize);
		r.kerned = self.kern && font.font.kern;
		r.UnderlinePosition = font.UnderlinePosition;
		r.UnderlineThickness = font.UnderlineThickness;
		r.CapHeight = font.CapHeight;
		r.XHeight = font.XHeight;
		r.Ascender = font.Ascender;
		r.Descender = font.Descender;
		s = "";
		for (i = tw = kw = 0; i < str.length; i++) {
			c = str.charAt(i);
			s += c == "\\" ? "\\\\" : c == ")" ? "\\)" : c == "(" ? "\\(" : c;
			v = str.charCodeAt(i);
			if (font.font.metrics[v]) {
				tw += font.font.metrics[v];
			}
			else if (font.family.metrics[v]) {
				tw += font.family.metrics[v];
			}
			// Kerning
			if (r.kerned && i < (str.length-1)) {
				c1 = str.charAt(i+1);
				if (font.font.kern[c] && font.font.kern[c][c1]) {
					r.str += s + ")" + font.font.kern[c][c1] + "(";
					s = "";
					kw += font.font.kern[c][c1];
				}
			}
		}
		r.str += s + ")";
		r.totalKern = kw;
		r.width = tw;
		r.textWidth = ((tw-kw) * (r.fontSize/72)) / 1000;
	}
	return r;
};
lattice.prototype.truncateText = function(str, w) {
	var kt, s, i;
	for (i = str.length; i >= 0; i--) {
		s = str.slice(0, i);
		kt = self.kernText(s);
		if (kt.textWidth <= w) {
			break;
		}
	}
	return s;
};
lattice.prototype.text = function(x, y, str, fontSize, fontFamily, fontBold, fontItalic, foreColor, href) {
	var Y, kt, fColor = foreColor || (href ? "0000ff" : self.foreColor), fSize = fontSize || self.fontSize;
	setMaxY(y);
	if (CStr(str) != "") {
		kt = self.kernText(str, fontSize, fontFamily, fontBold, fontItalic);
		Y = y + (self.fontAlignment == self.CAPHEIGHT ? kt.CapHeight : self.fontAlignment == self.ASCENDER ? kt.Ascender : 0);
		add(TEXT, 
					xFont(fontFamily, fontBold, fontItalic) +
					fSize + " 0 0 " + fSize + " " + fn(mapX(x)) + " " + fn(mapY(Y/*+(fSize/80)*/)) + " Tm\r\n" +
					xForeColor(fColor) +
					(kt.totalKern > 0 ? "[" + kt.str + "]TJ" : kt.str + "Tj"));
		if (href) {
			mkLink(x, Y, kt, href, fColor);
		}
	}
	return kt;
};
lattice.prototype.textCenter = function(x, y, width, str, fontSize, fontFamily, fontBold, fontItalic, foreColor, href) {
	var kt;
	if (CStr(str).trim() != "") {
		kt = self.kernText(str, fontSize, fontFamily, fontBold, fontItalic);
		self.text(x + ((width/2) - (kt.textWidth/2)), y, str, fontSize, fontFamily, fontBold, fontItalic, foreColor, href);
	}
};
lattice.prototype.textRight = function(x, y, width, str, fontSize, fontFamily, fontBold, fontItalic, foreColor, href) {
	var kt;
	if (CStr(str).trim() != "") {
		kt = self.kernText(str, fontSize, fontFamily, fontBold, fontItalic);
		self.text(x + width - kt.textWidth, y, str, fontSize, fontFamily, fontBold, fontItalic, foreColor, href);
	}
};
lattice.prototype.textRotated = function(x, y, degrees, str, fontSize, fontFamily, fontBold, fontItalic, foreColor) {
	var kt, rads, fSize = fontSize || self.fontSize;
	setMaxY(y);		// don't know how to calculate this here??
	if (CStr(str).trim() != "") {
		kt = self.kernText(str, fontSize, fontFamily, fontBold, fontItalic);
		degrees %= 360;
		rads = degrees / degreesInRad;
		add(TEXT,
					xFont(fontFamily, fontBold, fontItalic) +
					fn(Math.cos(rads) * fSize) + " " + fn(Math.sin(radsInCircle - rads) * fSize) + " " + fn(Math.sin(rads) * fSize) + " " + fn(Math.cos(radsInCircle - rads) * fSize) + " " + fn(mapX(x-0.115)) + " " + fn(mapY(y+0.015)) + " Tm\r\n" +
					xForeColor(foreColor) +
					(kt.totalKern > 0 ? "[" + kt.str + "]TJ" : kt.str + "Tj"));
	}
};
lattice.prototype.clearHeader = function() {
	output[O_HEADER] = {text:[], graphics:[], annotations:[], top:0, left:0};
};
lattice.prototype.startHeader = function(leftMargin, topMargin) {
	if (outputIndex == O_PAGE) {
		self.clearHeader();
		output[O_HEADER].state = getState();
		output[O_HEADER].left = leftMargin || 0;
		output[O_HEADER].top = topMargin || 0;
		outputIndex = O_HEADER;
		pdfState = {};
	}
	else {
		throw new Error("lattice.startHeader: Already started a " + outputs[outputIndex]);
	}
};
lattice.prototype.endHeader = lattice.prototype.endFooter = lattice.prototype.endWatermark = function() {
	outputIndex = O_PAGE;
	pdfState = {};
	setState(output[O_HEADER].state);
};
lattice.prototype.clearFooter = function() {
	output[O_FOOTER] = {text:[], graphics:[], annotations:[], top:0, left:0};
};
lattice.prototype.startFooter = function(leftMargin, topMargin) {
	if (outputIndex == O_PAGE) {
		self.clearFooter();
		output[O_FOOTER].state = getState();
		output[O_FOOTER].left = leftMargin || 0;
		output[O_FOOTER].top = topMargin || 0;
		outputIndex = O_FOOTER;
		pdfState = {};
	}
	else {
		throw new Error("lattice.startFooter: Already started a " + outputs[outputIndex]);
	}
};
lattice.prototype.endFooter = function() {
	outputIndex = O_PAGE;
	pdfState = {};
	setState(output[O_FOOTER].state);
};
lattice.prototype.clearWatermark = function() {
	output[O_WATERMARK] = {text:[], graphics:[], annotations:[], top:0, left:0};
};
lattice.prototype.startWatermark = function(leftMargin, topMargin) {
	if (outputIndex == O_PAGE) {
		self.clearWatermark();
		output[O_WATERMARK].state = getState();
		output[O_WATERMARK].left = leftMargin || 0;
		output[O_WATERMARK].top = topMargin || 0;
		outputIndex = O_WATERMARK;
		pdfState = {};
	}
	else {
		throw new Error("lattice.startWatermark: Already started a " + outputs[outputIndex]);
	}
};
lattice.prototype.endWatermark = function() {
	outputIndex = O_PAGE;
	pdfState = {};
	setState(output[O_WATERMARK].state);
};
lattice.prototype.image = function(name, x, y, width, height, rotation, skewX, skewY) {
	var w, h, bh, bw, aspect, img;
	function doRotation(degrees) {
		var rads;
		if (isDefined(degrees)) {
			rads = (degrees % 360) / degreesInRad;
			return fn(Math.cos(rads)) + " " + fn(Math.sin(radsInCircle - rads)) + " " + fn(Math.sin(rads)) + " " + fn(Math.cos(radsInCircle - rads)) + " 0 0 cm\r\n";
		}
		return "";
	}
	function doSkew(degreesX, degreesY) {
		var radsX, radsY;
		if (isDefined(degreesX) || isDefined(degreesY)) {
			radsX = isDefined(degreesX) ? (degreesX % 360) / degreesInRad : 0;
			radsY = isDefined(degreesY) ? (degreesY % 360) / degreesInRad : 0;
			return "1 " + (radsX ? fn(Math.tan(radsX)) : 0) + " " + (radsY ? fn(Math.tan(radsY)) : 0) + " 1 0 0 cm\r\n";
		}
		return "";
	}
	img = this.images[name];
	if (img) {
		bh = img.height / img.dpiVert;
		bw = img.width / img.dpiHoriz;
		aspect = bw / bh;
		w = isDefined(width) ? width : isDefined(height) ? height * aspect : bw;
		h = isDefined(height) ? height : isDefined(width) ? width / aspect : bh;
		setMaxY(y+h);
		add(GRAPHICS, 
				"q\r\n" +
				fn(mapV(w)) + " 0 0 " + fn(mapV(h)) + " " + fn(mapX(x)) + " " + fn(mapY(y+h)) + " cm" + "\r\n" +
				doRotation(rotation) +
				doSkew(skewX, skewY) +
				"/" + name + " Do\r\n" +
				"Q");
	}
	else {
		throw new Error("Undefined image " + name);
	}
};
lattice.prototype.loadImage = function(name, path, x, y, width, height, rotation, skewX, skewY) {
	var bmp = getBitmap(path);

	if (bmp !== null) {
		bmp.data = getBitmapData(bmp);
		bmp.paletteLength = bmp.palette ? bmp.palette.length : 0;
		bmp.ascii85ColorSpace = bmp.paletteLength > 0 ? toAscii85(runLengthEncode(flatten(bmp.palette))) : "";
		bmp.ascii85Data = toAscii85(runLengthEncode(packBytes(flatten(bmp.data), bmp.bitsPerPixel)));
		bmp.bitsPerComponent = (bmp.bitsPerPixel < 8 ? bmp.bitsPerPixel : 8);
		this.images[name] = bmp;
		genImageObjects(name);
		if (isDefined(x) && isDefined(y)) {
			this.image(name, x, y, width, height, rotation, skewX, skewY);
		}
	}
	else {
		throw new Error("Invalid BMP data");
	}
};
// Write out the page contents, then create and write out all of the page level objects.
lattice.prototype.newPage = function(pageOrientation) {
	writePage();
	if (isDefined(pageOrientation)) {
		self.pageOrientation = pageOrientation;
		self.pageWidth = self.pageOrientation == self.LANDSCAPE ? 11 : 8.5;
		self.pageHeight = self.pageOrientation == self.LANDSCAPE ? 8.5 : 11;
	}
	objNo += 1;
	pageRefs[pageRefs.length] = null;
	pdfState = {};
	output[O_PAGE].text = [];
	output[O_PAGE].graphics = [];
	output[O_PAGE].annotations = [];
	output[O_PAGE].obj = null;
	output[O_PAGE].maxY = 0;
};
// Purge the last page and write the document level objects
lattice.prototype.toString = function() {
	var i, j, s, d, xRef, root, pg, info;
	
	if (!finished) {
		writePage();
		d = new Date();

		pg = pdfObject(null, "/Nums[0<</S/D>>]");
		s = "";
		for (j = 1; j < pageRefs.length; j++) {
			s += objRef(pageRefs[j]) + " ";
		}
		s = s.trim();
		pdfObject(pageTree, "/Type/Pages/Count " + (pageRefs.length-1) + "\r\n/Kids[" + s + "]");
		root = pdfObject(null, "/Type/Catalog\r\n/PageLabels " + objRef(pg) + "\r\n/Pages " + objRef(pageTree));
		info = pdfObject(null, "/Creator(lattice)\r\n/Producer(lattice)\r\n/CreationDate(D:" + formatDate(d, "YMDHNS") + ")\r\n/ModDate(D:" + formatDate(d, "YMDHNS") + ")");

		xRef = fileOffset;
		// Now do the Xref table
		write("xref\r\n0 " + pdfObjects.length + "\r\n0000000010 65535 f");
		for (i = 1; i < pdfObjects.length; i++) {
			s = "";
			for (j = CStr(pdfObjects[i]).length; j < 10; j++) {
				s += "0";
			}
			write(s + CStr(pdfObjects[i]) + " 00000 n");
		}
		write("trailer\r\n<<\r\n/Size " + pdfObjects.length + "\r\n/Root " + objRef(root) + "\r\n/Info " + objRef(info) + "\r\n/ID[" + pdfIdentifier() + "]" + "\r\n>>");
		write("startxref\r\n" + xRef + "\r\n%%EOF");
		buf.add("");
		finished = true;
	}
	return buf.toString();
};
// Generate a report from the report template in (rep)
lattice.prototype.report = function (rep, callback) {
	var i, j, h, data, section, pendingPageBreak = false, hasCallback = typeof(callback)=="function";

	if (rep.data) {
		data = rep.data;
	}
	else {
		throw new Error("You must provide a data element in the report object");
	}
	if (isDefined(rep.firstPageNumber) && !isNaN(parseInt(rep.firstPageNumber,10))) {
	   rep.pageNo = rep.firstPageNumber - 1;
	}
	else {
		rep.pageNo = 0;
	}
	rep.pageFooterTop = self.pageHeight;
	rep.pageY = rep.firstPageYOffset || output[O_PAGE].maxY;
	rep.hasPageHeader = false;
	rep.deferredGroupHeaders = [];
	rep.deferredGroupHeaderHeight = 0;
	rep.topMargin = rep.topMargin || 0;
	rep.bottomMargin = rep.bottomMargin || 0;
	rep.leftMargin = rep.leftMargin || 0;
	rep.rightMargin = rep.rightMargin || 0;
	rep.fontFamily = rep.fontFamily || "Times Roman";
	rep.fontSize = rep.fontSize || 10;
	rep.foreColor = rep.foreColor || "000000";
	rep.lineWidth = rep.lineWidth || 0.5;
	rep.lineStyle = rep.lineStyle || self.LINE_SOLID;
	rep.defaultTop = isDefined(rep.defaultTop) ? rep.defaultTop : rep.fontSize * 0.015;
	rep.specialFields = {
		"PageNumber":	function() {
			return rep.pageNo;
		},
		"PrintDate":	function() {
			return formatDate(new Date(), "m/d/Y T");
		},
		"RecordNumber":	function() {
			return rep.recNo;
		}
	};
	rep.defaultZIndex = {
		"PH": 1,
		"PF": 1,
		"RH": 1,
		"RF": 1,
		"GH": 2,
		"GF": 2,
		"DT": 3
	};
	// Page stack is for stacking graphics objects (lines/rectangles)
	// There are actually 5 stacks, one for each of the supported zIndexes.
	// zIndex 0 is for items on the bottom .... zIndex 4 is for items on top.
	// zIndex 0 and 4 are reserved for the user so that they can put anything on bottom or top.
	// See rep.defaultZIndex, Detail sections are on top of group sections which are on top of page headers/footers
	// Text has a higher zIndex than any graphic object -- text is always on top.
	// If two text fields overlap, the one puked out latest is on top (why would you overlap text???)
	rep.pageStack=[[],[],[],[],[]];
	
	// Stack a PDF operation for execution later
	function pdfStack(fn, zIndex) {
		var args = Array.prototype.slice.call(arguments,2);
		var z = isDefined(zIndex) ? zIndex : 3;
		rep.pageStack[z].push({fn:fn, args:args});
	}
	// Scan the pagestack and execute all saved PDF operations
	function pdfUnstack() {
		var i, j;
		for (i in rep.pageStack) {
			if (rep.pageStack.hasOwnProperty(i)) {
				for (j in rep.pageStack[i]) {
					if (rep.pageStack[i].hasOwnProperty(j)) {
						rep.pageStack[i][j].fn.apply(self, rep.pageStack[i][j].args);
					}
				}
			}
		}
	}
	// Graphics primitives (vertical line and Box) can span sections. if they do, then they are
	// put onto a stack and emitted when the section they span to is printed
	function unstack(stk, resetToTop) {
		var i, bot;
		for (i = 0; i < stk.length; i++) {
			bot = resetToTop ? 0 : stk[i].bottom;
			if (stk[i].type == "VL") {
				pdfStack(self.vLine, stk[i].zIndex, stk[i].pageX, stk[i].pageY, (rep.pageY+bot)-stk[i].pageY, stk[i].foreColor, stk[i].lineWidth, stk[i].lineStyle);
			}
			else if (stk[i].type == "BX") {
				pdfStack(self.rectangle, stk[i].zIndex, stk[i].pageX, stk[i].pageY, stk[i].width, (rep.pageY+bot)-stk[i].pageY, stk[i].foreColor, stk[i].fillColor, stk[i].lineWidth, stk[i].lineStyle);
			}
		}
	}
	function unstackSection(sect) {
		if (sect.stack.length > 0) {
			unstack(sect.stack);
			sect.stack = [];
		}
	}
	// Get value for a field, takes care of the type of field and the format of the field
	function getValue(fld) {
		var i, a, f, v = "", fmt;
		if (!fld || typeof(fld) != "object") {
			return fld;
		}
		if (fld.type == T_LITERAL) {
			v = fld.field;
		}
		else if (fld.type == T_RUNNING) {
			if (isDefined(rep.runningTotals[fld.field])) {
				v = rep.runningTotals[fld.field].value;
				fmt = fld.format || rep.runningTotals[fld.field].format;
			}
			else {
				throw new Error("Undefined Running Total field: {#" + fld.field + "}");
			}
		}
		else if (fld.type == T_SPECIAL) {
			if (rep.specialFields[fld.field]) {
				v = rep.specialFields[fld.field]();
				fmt = fld.format;
			}
		}
		else if (fld.type == T_COMPLEX) {
			for (i = 0; i < fld.field.length; i++) {
				v += CStr(getValue(fld.field[i]));
			}
		}
		else if (data.length === 0 || !data[rep.recNo]) {
			return "";
		}
		else if (fld.type == T_FIELD) {
			f = data[rep.recNo];
			a = fld.field.split(".");
			for (i = 0; i < a.length-1; i++) {
				if (f) {
					f = f[a[i]];
				}
				else {
					throw new Error("Unknown field: " + fld.field);
				}
			}
			v = f && f[a[a.length-1]];
			fmt = fld.format || (rep.fields[fld.field] ? rep.fields[fld.field].format : null);
		}
		else if (fld.type == T_CALLBACK) {
			if (typeof(fld.field)=="function") {
				v = fld.field({PageNumber: rep.pageNo, RecordNumber: rep.recNo, data: data[rep.recNo]}, fld.parameter);
			}
		}
		if (isDefined(v)) {
			if (fmt) {
				v = fmt.indexOf("%") > -1 ? sprintf(fmt, v) : formatDate(v, fmt);
			}
		}
		return v;
	}
	// Puts a field out to the page. text goes out immediatly, graphics are stacked
	function putField(fld, y, z) {
		var v, href, img, height = fld.height || 0, zIndex = fld.zIndex || z;
		if (isDefined(fld.field)) {
			v = CStr(getValue(fld));
			if (fld.target) {
				href = CStr(getValue(fld.target));
			}
			if (fld.degrees) {		// Rotated Text
				self.textRotated(rep.leftMargin+fld.left, rep.pageY+fld.top, fld.degrees, v, fld.fontSize || fld.parent.fontSize || rep.fontSize, fld.fontFamily || fld.parent.fontFamily || rep.fontFamily, fld.fontBold || fld.parent.fontBold || rep.fontBold, fld.italic || fld.parent.fontItalic || rep.fontItalic, getValue(fld.foreColor) || fld.parent.foreColor || rep.foreColor);
			}
			else if (truthy(getValue(fld.html))) {
				height = fld.processedText.height;
				self.outputProcessedText(rep.leftMargin+fld.left, rep.pageY+fld.top, fld.processedText, fld.align);
				delete fld.processedText;
			}
			else if (truthy(getValue(fld.canGrow))) {
				v = fld.wrappedText || v;
				height = self.textWrap(rep.leftMargin+fld.left, rep.pageY+fld.top, fld.width, fld.height,v,fld.align || self.ALIGN_LEFT,fld.fontSize || fld.parent.fontSize || rep.fontSize, fld.fontFamily || fld.parent.fontFamily || rep.fontFamily, fld.fontBold || fld.parent.fontBold || rep.fontBold, fld.italic || fld.parent.fontItalic || rep.fontItalic, getValue(fld.foreColor) || (href ? "0000ff" : fld.parent.foreColor || rep.foreColor), href);
				delete fld.wrappedText;
			}
			else if (fld.align.toUpperCase() == self.ALIGN_CENTER) {
				self.textCenter(rep.leftMargin+fld.left, rep.pageY+fld.top,fld.width,self.truncateText(v,fld.width),fld.fontSize || fld.parent.fontSize || rep.fontSize, fld.fontFamily || fld.parent.fontFamily || rep.fontFamily, fld.fontBold || fld.parent.fontBold || rep.fontBold, fld.italic || fld.parent.fontItalic || rep.fontItalic, getValue(fld.foreColor) || (href ? "0000ff" : fld.parent.foreColor || rep.foreColor), href);
			}
			else if (fld.align.toUpperCase() == self.ALIGN_RIGHT) {
				self.textRight(rep.leftMargin+fld.left, rep.pageY+fld.top,fld.width,self.truncateText(v,fld.width),fld.fontSize || fld.parent.fontSize || rep.fontSize, fld.fontFamily || fld.parent.fontFamily || rep.fontFamily, fld.fontBold || fld.parent.fontBold || rep.fontBold, fld.italic || fld.parent.fontItalic || rep.fontItalic, getValue(fld.foreColor) || (href ? "0000ff" : fld.parent.foreColor || rep.foreColor), href);
			}
			else {
				self.text(rep.leftMargin+fld.left, rep.pageY+fld.top,self.truncateText(v,fld.width),fld.fontSize || fld.parent.fontSize || rep.fontSize, fld.fontFamily || fld.parent.fontFamily || rep.fontFamily, fld.fontBold || fld.parent.fontBold || rep.fontBold, fld.italic || fld.parent.fontItalic || rep.fontItalic, getValue(fld.foreColor) || (href ? "0000ff" : fld.parent.foreColor || rep.foreColor), href);
			}
		}
		else if (fld.type == "HL") {
			pdfStack(self.hLine, zIndex, rep.leftMargin+fld.left, rep.pageY + (fld.moveToBottom ? fld.parent.height : fld.top), fld.right-fld.left, getValue(fld.foreColor) || fld.parent.foreColor || rep.foreColor, isDefined(fld.lineWidth) ? fld.lineWidth : rep.lineWidth, fld.lineStyle || rep.lineStyle);
		}
		else if (fld.type == "VL") {
			if (fld.end) {		// stack the line
				rep.sections[fld.end].stack.push({type: "VL", pageX: rep.leftMargin+fld.left, pageY: rep.pageY+fld.top, bottom: fld.bottom, foreColor: getValue(fld.foreColor) || fld.parent.foreColor || rep.foreColor, lineWidth: isDefined(fld.lineWidth) ? fld.lineWidth : rep.lineWidth, lineStyle: fld.lineStyle || rep.lineStyle, zindex: zIndex});
			}
			else {
				pdfStack(self.vLine, zIndex, rep.leftMargin+fld.left, rep.pageY+fld.top, (fld.extendToBottom ? fld.parent.height : fld.bottom) - fld.top, getValue(fld.foreColor) || fld.parent.foreColor || rep.foreColor, isDefined(fld.lineWidth) ? fld.lineWidth : rep.lineWidth, fld.lineStyle || rep.lineStyle);
			}
		}
		else if (fld.type == "BX") {
			if (fld.end) {		// stack the box
				rep.sections[fld.end].stack.push({type: "BX", pageX: rep.leftMargin+fld.left, pageY: rep.pageY+fld.top, bottom: fld.bottom, width: fld.right-fld.left, foreColor: getValue(fld.foreColor) || fld.parent.foreColor || rep.foreColor, lineWidth: isDefined(fld.lineWidth) ? fld.lineWidth : rep.lineWidth, fillColor: getValue(fld.fillColor), lineStyle: fld.lineStyle || rep.lineStyle, zIndex: zIndex});
			}
			else {
				pdfStack(self.rectangle, zIndex, rep.leftMargin+fld.left, rep.pageY+fld.top, fld.right-fld.left, fld.bottom-fld.top, getValue(fld.foreColor) || fld.parent.foreColor || rep.foreColor, getValue(fld.fillColor), isDefined(fld.lineWidth) ? fld.lineWidth : rep.lineWidth, fld.lineStyle || rep.lineStyle);
			}
		}
		else {
			throw new Error("Undefined type: " + fld.type);
		}
		return height;
	}
	// Parse a field to determine it's type(s) and properties
	function initializeField(fld, checkGeometry) {
		var a, i, s, re, f, g, fields=[], v = fld.field;
		// Check gemetry specs
		if (checkGeometry) {
			if (isDefined(fld.guide)) {
				g = rep.guides[fld.guide];
				if (g) {
					if (!isDefined(fld.left) && !isDefined(fld.right)) {	// Do not override if one or the other isDefined
						fld.left = fld.type ? g.x : g.f;
					}
					fld.align = fld.align || g.a;
					fld.width = fld.width || (fld.type ? g.W : g.w);
				}
				else {
					throw new Error("Guide: " + fld.guide + " is not defined");
				}
			}
			fld.left = guideValue(fld.left);
			fld.right = guideValue(fld.right);
			fld.width = guideValue(fld.width);
			fld.align = guideValue(fld.align);
			if (!isDefined(fld.top) && (!isDefined(fld.bottom) || !isDefined(fld.height))) {
				fld.top = fld.type ? 0 : (isDefined(fld.parent.defaultTop) ? fld.parent.defaultTop : rep.defaultTop);
			}
			if (!isDefined(fld.bottom) && !isDefined(fld.height)) {
				fld.bottom = 0;
			}
			if (isDefined(fld.field) || fld.type == "HL" || fld.type == "BX") {
				if (isDefined(fld.left) && isDefined(fld.right)) {
					if (fld.right <= fld.left) {
						throw new Error("Right must be greater than left, field: " + fld.field || field.type);
					}
					fld.width = fld.right - fld.left;
				}
				else if (isDefined(fld.width) && isDefined(fld.left)) {
					fld.right = fld.left + fld.width;
				}
				else if (isDefined(fld.width) && isDefined(fld.right)) {
					if (fld.right < fld.width) {
						throw new Error("Right must be greater than width, field: " + fld.field || field.type);
					}
					fld.left = fld.right - fld.width;
				}
				else {
					throw new Error("Incomplete horizontal geometry specifications for field: " + fld.field || field.type);
				}
			}
			if (fld.type == "VL" || fld.type == "BX") {
				if (isDefined(fld.end)) {		// Must have both top and bottom defined
					if (isDefined(fld.top) === false || isDefined(fld.bottom) === false) {
						throw new Error("Must provide both top and bottom when a field spans sections: " + fld.field || field.type);
					}
				}
				else if (isDefined(fld.top) && isDefined(fld.bottom)) {
					if (fld.bottom < fld.top) {
						throw new Error("Bottom must be greater than top, field: " + fld.field || field.type);
					}
					fld.height = fld.bottom - fld.top;
				}
				else if (isDefined(fld.height) && isDefined(fld.top)) {
					fld.bottom = fld.top + fld.height;
				}
				else if (isDefined(fld.height) && isDefined(fld.bottom)) {
					if (fld.bottom <= fld.height) {
						throw new Error("Bottom must be greater than height, field: " + fld.field || field.type);
					}
					fld.top = fld.bottom - fld.height;
				}
				else if (!fld.extendToBottom) {
					throw new Error("Incomplete vertical geometry specifications for field: " + fld.field || field.type);
				}
			}			
		}			
		if (isDefined(v)) {
			// Regular expression is:
			// \{			= Look for the start of a field
			// ([\*@#\^]?)	= In parenthesis so save match to a[1], [\*@#^]? = find zero or one occurrences of *,@,# or ^
			// ([^}:]+)		= One or more occurrences of any character except } or :, save to a[2]
			// :?			= zero or one occurrences of :
			// ([^}]*)		= zero or more occurrences of any character except a }, saved to a[3]
			// \}			= look for the end of a field
			// (.*)			= Find any trailing characters and save to a[4]
			// After exec
			// if no match (a == null), the field is a literal
			// If match
			//		a.index > 0, there were literal characters before a field match, push on as a literal field
			//		a[1] = type of field, * = special, ^ = callback, # = running total, "" (empty string) = DB field
			//		a[2] = Name of the field
			//		a[3] = Optional format string for sprintf or formatDate type of formats (i.e. %.2f or o/d/Y)
			//		a[4] = remaining part of string, this will be rescanned for any more matches.
			re = /\{([\*@#\^]?)([^}:]+):?([^}]*)\}(.*)/;
			a = re.exec(v);
			while (a) {
				if (a.index > 0) {
					fields.push({field:v.slice(0,a.index), type: T_LITERAL});
				}
				f = {field: a[2]};
				if (a[3] != "") {
					f.format = a[3];
				}
				if (a[1] == "*") {		// Special Field
					if (typeof(rep.specialFields[a[2]])!="function") {
						throw new Error("Invalid special field: " + s);
					}
					f.type = T_SPECIAL;
				}
				else if (a[1] == "^") {		// Callback Field
					if (typeof(rep.callbacks[a[2]]) !== "function") {
						throw new Error("Invalid callback field: " + s);
					}
					f.type = T_CALLBACK;
					f.field = rep.callbacks[a[2]];
					if (f.format) {
						f.parameter = f.format;
						delete f.format;
					}
				}
				else if (a[1] == "#") {		// Running Total Field
					f.type = T_RUNNING;
				}
				else if (a[1] == "@") {		// Formula Field
					f.type = T_FORMULA;
				}
				else {
					f.type = T_FIELD;
				}
				fields.push(f);
				v = a[4];
				a = re.exec(v);
			}
			if (v != "") {
				fields.push({field: v, type: T_LITERAL});
			}
			if (fields.length === 0) {
				fld.type = T_LITERAL;
			}
			else if (fields.length == 1) {
				fld.field = fields[0].field;
				fld.type = fields[0].type;
				if (fields[0].format) {
					fld.format = fields[0].format;
				}
				if (fields[0].parameter) {
					fld.parameter = fields[0].parameter;
				}
			}
			else {
				if (isDefined(a) && a[4] != "") {
					fields.push({field: a[4], type: T_LITERAL});
				}
				fld.field = fields;
				fld.type = T_COMPLEX;
			}
		}
		if (fld.end && !isDefined(rep.sections[fld.end])) {
			throw new Error("End section: " + fld.end + " is not defined");
		}
		for (i in fld) {
			if (isFoundIn(i, ["suppress","show","target","foreColor","fillColor","html","canGrow"])) {
				if (CStr(fld[i]).indexOf("{") >= 0) {
					fld[i] = {field: fld[i]};
					initializeField(fld[i]);
				}
			}
		}
	}
	// Initialize running total fields (if any)
	function initializeRunningTotals() {
		var i;
		rep.runningTotals = rep.runningTotals || {};
		for (i in rep.runningTotals) {
			if (rep.runningTotals.hasOwnProperty(i)) {
				rep.runningTotals[i].value = null;
				initializeField(rep.runningTotals[i], false);
			}
		}
	}
	// Process running totals
	function processRunningTotals() {
		var i, v, fld, old;
		for (i in rep.runningTotals) {
			if (rep.runningTotals.hasOwnProperty(i)) {
				fld = rep.runningTotals[i];
				v = getValue(fld);
				if (isDefined(v)) {
					if (typeof(v) == "date") {
						v = new Date(v);
					}
					if (fld.operation == "COUNT") {
						fld.value = isDefined(fld.value) ? fld.value + 1 : 1;
					}
					else {
						if (fld.operation == "SUM") {
							if (isNumeric(v)) {
								v = parseFloat(v);
								fld.value = isDefined(fld.value) ? parseFloat(fld.value) + v : v;
							}
						}
						else if (fld.operation == "MAX") {
							fld.value = isDefined(fld.value) ? fld.value.valueOf() > v.valueOf() ? fld.value : v : v;
						}
						else if (fld.operation == "MIN") {
							fld.value = isDefined(fld.value) ? fld.value.valueOf() < v.valueOf() ? fld.value : v : v;
						}
						else {
							throw new Error("Invalid Running Total operation: " + fld.operation);
						}
					}
				}
			}
		}
	}
	// Reset Running totals -- applies when a running total is to be reset on a change in a group.
	function resetRunningTotals(group) {
		var i, fld;
		for (i in rep.runningTotals) {
			if (rep.runningTotals.hasOwnProperty(i)) {
				fld = rep.runningTotals[i];
				if (fld.resetOnGroup == group) {
					fld.value = null;
				}
			}
		}
	}
	function startPage() {
		var i, j, a, h, sect, fld, footerHeight = 0;
		rep.pageY = ((rep.pageNo === 0 ? rep.firstPageYOffset || output[O_PAGE].maxY : 0) || 0) + rep.topMargin;
		rep.pageNo += 1;
		rep.pageStack=[[],[],[],[],[]];
		for (i in rep.sections) {
			if (rep.sections.hasOwnProperty(i)) {
				sect = rep.sections[i];
				if (sect.type == "PH") {
					if ((!isDefined(sect.suppress) || !truthy(getValue(sect.suppress))) && (!isDefined(sect.show) || truthy(getValue(sect.show)))) {
						unstackSection(sect);
						sect.height = getSectionHeight(sect);
						for (j = 0; j < sect.items.length; j++) {
							fld = sect.items[j];
							if (isDefined(fld) && (!isDefined(fld.suppress) || !truthy(getValue(fld.suppress))) && (!isDefined(fld.show) || truthy(getValue(fld.show)))) {
								h = putField(fld, rep.pageY, sect.zIndex);
							}
						}
						if (!sect.underlay) {
							rep.pageY += sect.height;
						}
					}
				}
				else if (sect.type == "PF" && (!isDefined(sect.suppress) || !truthy(getValue(sect.suppress))) && (!isDefined(sect.show) || truthy(getValue(sect.show)))) {
					footerHeight += sect.minHeight;
				}
			}
		}
		// Now figure out where the top of the page footer goes
		rep.pageFooterTop = self.pageHeight - rep.bottomMargin - footerHeight;
		if (rep.pageNo != 1) {
			// Find groups that repeat their header at the top of each page
			for (i in rep.groups) {
				if (rep.groups[i].repeatHeader || (rep.deferredGroupHeaders.length > 0 && !isFoundIn(i, rep.deferredGroupHeaders))) {
					deferGroupHeader(i);
				}
			}
			// Now -- in case some groups were already deferred, we need to reorder the deferred groups
			if (rep.deferredGroupHeaders.length > 0) {
				a = [];
				for (i in rep.groups) {
					if (isFoundIn(i, rep.deferredGroupHeaders)) {
						a.push(i);
					}
				}
				rep.deferredGroupHeaders = a;
			}
		}
	}
	function endPage() {
		var i, j, h, sect;
		if (isDefined(rep.pageFooterTop)) {
			// First unstack all non PF sections
			for (i in rep.sections) {
				if (rep.sections.hasOwnProperty(i)) {
					sect = rep.sections[i];
					// objects close here need to be repeated on the next page
					if (sect.type != "PF") {
						unstackSection(sect);
					}
				}
			}
			rep.pageY = rep.pageFooterTop;
			for (i in rep.sections) {
				if (rep.sections.hasOwnProperty(i)) {
					sect = rep.sections[i];
					if (sect.type == "PF") {
						sect.height = sect.minHeight;
						unstackSection(sect);
						for (j = 0; j < sect.items.length; j++ ) {
							if (isDefined(sect.items[j])) {
								putField(sect.items[j], rep.pageY, sect.zIndex);
							}
						}
						if (!sect.underlay) {
							rep.pageY += sect.height;
						}
					}
				}
			}
		}
		pdfUnstack();
		rep.recordsThisPage = 0;
	}
	function truthy(str) {
		var v = CStr(str).toLowerCase();
		return isFoundIn(v, ["","false"]) ? false : isNumeric(v) ? v !== 0 : !!v;
	}
	function processSection(type, group) {
		var i, j, h, sect, fld;
		for (i in rep.sections) {
			if (rep.sections.hasOwnProperty(i)) {
				sect = rep.sections[i];
				if (sect.type == type && (!group || sect.group == group)) {
					if ((!isDefined(sect.suppress) || !truthy(getValue(sect.suppress))) && (!isDefined(sect.show) || truthy(getValue(sect.show)))) {
						sect.height = getSectionHeight(sect);
						if (sect.newPageBefore || (sect.height + rep.pageY + (type != "GH" ? rep.deferredGroupHeaderHeight : 0) >= rep.pageFooterTop)) {
							endPage();
							self.newPage();
							startPage();
							if (type == "DT") {
								rep.recordsThisPage = 1;
							}
						}
						if (type == "DT" && rep.deferredGroupHeaders.length > 0) {
							for (j = 0; j < rep.deferredGroupHeaders.length; j++) {
								processSection("GH", rep.deferredGroupHeaders[j]);
							}
							rep.deferredGroupHeaders = [];
							rep.deferredGroupHeaderHeight = 0;
						}
						unstackSection(sect);
						for (j = 0; j < sect.items.length; j++ ) {
							fld = sect.items[j];
							if (isDefined(fld)) {
								if ((!isDefined(fld.suppress) || !truthy(getValue(fld.suppress))) && (!isDefined(fld.show) || truthy(getValue(fld.show)))) {
									putField(fld, rep.pageY, sect.zIndex);
								}
							}
						}
						if (!rep.sections[i].underlay) {
							rep.pageY += sect.height;
						}
						if (sect.newPageAfter) {
							if (type == "GF" || type == "RF") {
								endPage();
							}
							else {
								pendingPageBreak = true;
							}
						}
					}
				}
			}
		}
	}
	function initializeGroups() {
		var i;
		rep.groupOrder = [];
		for (i in rep.groups) {
			if (rep.groups.hasOwnProperty(i)) {
				rep.groupOrder.push(i);
				initializeField(rep.groups[i], false);
				rep.groups[i].records = 0;
				if (data[rep.recNo]) {
					rep.groups[i].value = getValue(rep.groups[i]);
					processSection("GH", i);
				}
				else {
					rep.groups[i].value = null;
				}
			}
		}
	}
	function processGroups() {
		var i, j, group;
		// Get new values for the groups
		for (i in rep.groups) {
			if (rep.groups.hasOwnProperty(i)) {
				group = rep.groups[i];
				group.oldValue = group.value;
				group.value = getValue(group);
				group.records += 1;
			}
		}
		// Now analyze for changes
		for (i = 0; i < rep.groupOrder.length; i++) {
			group = rep.groups[rep.groupOrder[i]];
			if (group.value !== group.oldValue) {
				// First, start at the end and emit all group footers up to & including this group
				for (j = rep.groupOrder.length-1; j >= i; j--) {
					rep.recNo -= 1;
					processSection("GF", rep.groupOrder[j]);
					rep.recNo += 1;
				}
				// force reset of all running totals that are to be reset on the change of a group
				for (j = i; j < rep.groupOrder.length; j++) {
					resetRunningTotals(rep.groupOrder[i]);
				}
				// change in group, force all lower priority groups to end
				for (j = i; j < rep.groupOrder.length; j++) {
					group = rep.groups[rep.groupOrder[j]];
					if (group.records > 0) {
						deferGroupHeader(rep.groupOrder[j]);
					}
				}
				break;
			}
		}
	}
	function deferGroupHeader(group) {
		var i, sect;
		rep.deferredGroupHeaders.push(group);
		rep.groups[group].records = 0;
		for (i in rep.sections) {
			if (rep.sections.hasOwnProperty(i)) {
				sect = rep.sections[i];
				if (sect.type == "GH" && sect.group == group) {
					rep.deferredGroupHeaderHeight += getSectionHeight(sect);
				}
			}
		}
	}
	function getSectionHeight(sect) {
		var i, v, h, fld, lines, height, fontSize, fontFamily, fontBold, fontItalic, font;
		height = sect.minHeight;
		for (i = 0; i < sect.items.length; i++ ) {
			fld = sect.items[i];
			if (isDefined(fld)) {
				h = fld.type == "IM" ? 0 : isNumeric(fld.height) ? Number(fld.height) : 0;
				if (fld.field) {
					v = getValue(fld);
					fontSize = fld.fontSize || sect.fontSize || rep.fontSize || self.fontSize;
					fontFamily = fld.fontFamily || sect.fontFamily || rep.fontFamily || self. fontFamily;
					fontBold = fld.fontBold || sect.fontBold || rep.fontBold || self. fontBold;
					fontItalic = fld.fontItalic || sect.fontItalic || rep.fontItalic || self. fontItalic;
					font = getFont(fontFamily, fontBold, fontItalic, fontSize);
					if (truthy(getValue(fld.html))) {
						fld.processedText = self.processText(v, fld.width, null, fontSize, fld.fontFamily, fld.fontBold, fld.italic);
						h = fld.processedText.height;
					}
					else {
						lines = 1;
						if (truthy(getValue(fld.canGrow))) {
							fld.wrappedText = self.wordWrap(fld.width, fld.height, v, fontSize, fld.fontFamily, fld.fontBold, fld.italic);
							lines = fld.wrappedText.length;
						}
						if (self.fontAlignment == self.BASELINE) {
							lines -= 1;
						}
						h = (((1.12*fontSize)/72) * lines) + (self.fontAlignment == self.BASELINE ? ((fontSize*0.12)/72) - font.Descender : 0);
					}
				}
				height = Math.max(height, h + fld.top);
			}
		}
		return height;
	}
	function guideValue(v) {
		var a;
		if (typeof(v) == "string") {
			a = v.split(".");
			if (a.length == 2 && isFoundIn(a[1], ["x","f","r","w","W","X"])) {
				if (rep.guides[a[0]]) {
					return rep.guides[a[0]][a[1]];
				}
				throw new Error("Invalid guide reference: " + v);
			}
		}
		return v;
	}
	function initializeGuideLines() {
		var i, v, g, fc, x=0, obj={};
		g = rep.guides;
		if (typeof(g)=="object") {
			obj = {pad: 0.05, left: 0};
			for (i in g) {
				if (g.hasOwnProperty(i)) {
					obj.pad = isDefined(g[i].pad) ? g[i].pad : obj.pad;
					if (isDefined(g[i].left)) {
						obj.left = g[i].left;
						x = obj.left;
					}
					fc = fc || i;
					v = g[i].width;
					if (g[i].reset) {
						x = obj.left;
					}
					obj[i] = {
						a: g[i].align || self.ALIGN_LEFT,
						x: Round(x, 3),
						X: Round(x + v, 3),
						f: Round(x + obj.pad, 3),
						r: Round(x + v - obj.pad, 3),
						W: Round(v, 3),
						w: Round(v - (obj.pad*2), 3)
					};
					x += v;
				}
			}
			obj.rw = {
				a: self.ALIGN_CENTER,
				x: obj[fc].x,
				X: Round(x, 3),
				f: obj[fc].f,
				r: Round(x - obj.pad, 3),
				W: Round(x - obj[fc].x, 3),
				w: Round(x - obj[fc].x - (obj.pad*2), 3)
			};
		}
		return obj;
	}

	if (!isDefined(rep.fields)) {
		rep.fields = {};
	}

	// Initialize Guidelines
	rep.guides = initializeGuideLines();

	// Initialize sections
	for (i in rep.sections) {
		if (rep.sections.hasOwnProperty(i)) {
			section = rep.sections[i];
			section.minHeight = isNumeric(section.minHeight) ? parseFloat(section.minHeight) : 0;
			rep.hasPageHeader = section.type == "PH" ? true : rep.hasPageHeader;
			section.stack = [];
			if (!isDefined(section.zIndex)) {
				section.zIndex = rep.defaultZIndex[section.type];
			}
			for (j in section.items) {
				if (section.items.hasOwnProperty(j)) {
					section.items[j].parent = section;
					initializeField(section.items[j], true);
				}
			}
			if (isDefined(section.suppress)) {
				section.suppress = {field: section.suppress};
				initializeField(section.suppress);
			}
			if (isDefined(section.show)) {
				section.show = {field: section.show};
				initializeField(section.show);
			}
		}
	}
	
	// Initialize Running total formulas
	initializeRunningTotals();

	if (isDefined(rep.fontFamily) || isDefined(rep.fontSize)) {
		self.setFont(rep.fontSize, rep.fontFamily);
	}

	// Process the data
	rep.recNo = rep.recordsThisPage = 0;
	processSection("RH");
	startPage();
	initializeGroups();
	if (!hasCallback) {			// No callback -- do this synchrously
		while (rep.recNo < data.length) {
			self.emit("beforeReportNewRecord", data[rep.recNo]);
			if (pendingPageBreak) {
				pendingPageBreak = false;
				endPage();
			}
			processGroups();
			processRunningTotals();
			rep.recordsThisPage += 1;
			processSection("DT");
			rep.recNo += 1;
		}
		if (rep.recNo > 0) {
			rep.recNo -= 1;
			for (i in rep.groups) {
				if (rep.groups.hasOwnProperty(i)) {
					processSection("GF", i);
				}
			}
		}
		if (rep.recordsThisPage > 0 || (rep.recNo > 0 && rep.pageNo == 1 && rep.hasPageHeader)) {
			processSection("RF");
			endPage();
		}
	}
	else {				// Has a callback -- do this asynchrously
		(function dataLoop() {
			var i;
			if (rep.recNo >= data.length) {
				if (rep.recNo > 0) {
					rep.recNo -= 1;
					for (i in rep.groups) {
					    if (rep.groups.hasOwnProperty(i)) {
							processSection("GF", i);
						}
					}
				}
				if (rep.recordsThisPage > 0 || (rep.recNo > 0 && rep.pageNo == 1 && rep.hasPageHeader)) {
					processSection("RF");
					endPage();
				}
				callback(rep);
				return;
			}
			self.emit("beforeReportNewRecord", data[rep.recNo]);
			if (pendingPageBreak) {
				pendingPageBreak = false;
				endPage();
			}
			processGroups();
			processRunningTotals();
			rep.recordsThisPage += 1;
			processSection("DT");
			rep.recNo += 1;
			process.nextTick(dataLoop);
		})();
	}
};

exports.newReport = function(orientation) {
	return new lattice(orientation);
};
