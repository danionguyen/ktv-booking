// Dựng UI Screen Flow trên page "Components" của file Figma "KTV Booking – UI"
// (fileKey G5BOXFsGvWBRbJZPFoJg9f). Chạy bằng Figma MCP `use_figma` khi hạn mức gói Starter đã reset,
// hoặc dán vào một plugin "Scripter" trong Figma (bỏ dòng `return` cuối nếu plugin không hỗ trợ).
// Mỗi màn là bản clone thu nhỏ (rescale) của frame SCR-xx thật, nối bằng mũi tên có nhãn.
await Promise.all(['Regular','Medium','Semi Bold','Bold'].map(s=>figma.loadFontAsync({family:'Inter',style:s})));
const hex=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const S=(h,o)=>({type:'SOLID',color:hex(h),...(o!=null?{opacity:o}:{})});
const page=figma.currentPage;
for(const old of page.children.filter(n=>n.type==='SECTION'&&n.name.startsWith('Flow ·')))old.remove();
const lib=page.findOne(n=>n.name==='Library');
const X0=lib.x+lib.width+400;
const GOLD='#B8892B';
function T(c,size,style,col,w){const t=figma.createText();t.fontName={family:'Inter',style};t.fontSize=size;t.characters=c;t.fills=[S(col)];if(w){t.resize(w,t.height);t.textAutoResize='HEIGHT';}return t;}
const CW=400,CX=640,RG=240;
// Tìm frame màn hình theo tên "SCR-xx · …" (bỏ qua bản "· Theme …") để chạy được cả trên file đã duplicate.
const SRC={};
for(const p of figma.root.children){if(p===page)continue;await p.loadAsync();
 for(const n of p.children){const m=n.type==='FRAME'&&!n.name.includes('· Theme')&&n.name.match(/^SCR-(\w+) · /);if(m)SRC[m[1]]=n.id;}}
let cloned=0;
async function card(code,title,note){const c=figma.createAutoLayout('VERTICAL');c.name='Card/SCR-'+code;c.itemSpacing=10;c.fills=[];
 const hd=figma.createAutoLayout('HORIZONTAL');hd.itemSpacing=10;hd.counterAxisAlignItems='CENTER';hd.fills=[];
 const pill=figma.createAutoLayout('HORIZONTAL');pill.fills=[S('#1F1A12')];pill.cornerRadius=6;pill.paddingLeft=pill.paddingRight=8;pill.paddingTop=pill.paddingBottom=3;pill.appendChild(T('SCR-'+code,12,'Bold','#F7E7A1'));
 hd.appendChild(pill);hd.appendChild(T(title,16,'Semi Bold','#1F1A12'));c.appendChild(hd);
 const src=await figma.getNodeByIdAsync(SRC[code]);const k=CW/src.width;const ih=Math.round(src.height*k);
 const sh=figma.createFrame();sh.name='Shot/SCR-'+code;sh.resize(CW,ih);sh.cornerRadius=10;sh.fills=[S('#D9D4CA')];sh.strokes=[S('#C9C2B4')];sh.strokeWeight=1;sh.clipsContent=true;
 sh.effects=[{type:'DROP_SHADOW',color:{r:0.12,g:0.09,b:0.04,a:0.14},offset:{x:0,y:8},radius:24,spread:0,visible:true,blendMode:'NORMAL'}];
 c.appendChild(sh);
 const cl=src.clone();sh.appendChild(cl);cl.name='Thumb/'+src.name;cl.rescale(k);cl.x=0;cl.y=0;cloned++;
 if(note){const n=T(note,13,'Regular','#5E574B',CW);c.appendChild(n);n.layoutSizingHorizontal='FILL';}
 return c;}
async function arrow(sec,pts,label,dashed){const v=figma.createVector();v.name='Arrow'+(label?'/'+label:'');sec.appendChild(v);v.x=0;v.y=0;
 await v.setVectorNetworkAsync({vertices:pts.map(([x,y],i)=>({x,y,strokeCap:i===pts.length-1?'ARROW_LINES':'NONE'})),segments:pts.slice(1).map((_,i)=>({start:i,end:i+1})),regions:[]});
 v.strokes=[S(GOLD)];v.strokeWeight=2.5;v.strokeJoin='ROUND';v.cornerRadius=18;if(dashed)v.dashPattern=[10,8];v.fills=[];
 if(label){let best=0,bi=0;for(let i=0;i<pts.length-1;i++){const d=Math.abs(pts[i+1][0]-pts[i][0])+Math.abs(pts[i+1][1]-pts[i][1]);if(d>best){best=d;bi=i;}}
  const mx=(pts[bi][0]+pts[bi+1][0])/2,my=(pts[bi][1]+pts[bi+1][1])/2;
  const p=figma.createAutoLayout('HORIZONTAL');p.name='Label';p.fills=[S('#1F1A12')];p.cornerRadius=999;p.paddingLeft=p.paddingRight=12;p.paddingTop=p.paddingBottom=5;p.appendChild(T(label,13,'Medium','#F7E7A1'));sec.appendChild(p);p.x=mx-p.width/2;p.y=my-p.height/2;}}
async function flow(title,sub,y0,items,edges){
 const sec=figma.createSection();sec.name='Flow · '+title;page.appendChild(sec);sec.x=X0;sec.y=y0;sec.fills=[S('#FBFAF7')];
 const t1=T(title,48,'Bold','#1F1A12');sec.appendChild(t1);t1.x=80;t1.y=60;const t2=T(sub,18,'Regular','#5E574B');sec.appendChild(t2);t2.x=80;t2.y=128;
 const cards={};for(const [code,ti,c,r,note] of items){const cd=await card(code,ti,note);sec.appendChild(cd);cards[code]={n:cd,c,r};}
 const rows=[...new Set(items.map(i=>i[3]))].sort((a,b)=>a-b);const rh={};for(const r of rows)rh[r]=Math.max(...Object.values(cards).filter(x=>x.r===r).map(x=>x.n.height));
 const ry={};let y=240;for(const r of rows){ry[r]=y;y+=rh[r]+RG;}
 for(const k in cards){const x=cards[k];x.n.x=80+x.c*CX;x.n.y=ry[x.r];}
 const B=k=>{const n=cards[k].n;return {x:n.x,y:n.y,w:n.width,h:n.height,cx:n.x+n.width/2};};
 const rowBottom=r=>ry[r]+rh[r];
 for(const e of edges){const [a,b,kind,label,o={}]=e;const A=B(a),Bb=B(b);let pts;const ay=A.y+(o.ay??150),by=Bb.y+(o.by??150);
  if(kind==='h'){const sx=A.x+A.w,ex=Bb.x;const mx=(o.mx!=null)?sx+o.mx:(sx+ex)/2;pts=ay===by?[[sx,ay],[ex,by]]:[[sx,ay],[mx,ay],[mx,by],[ex,by]];}
  else if(kind==='hl'){pts=[[A.x,ay],[Bb.x+Bb.w,by]];}
  else if(kind==='v'){pts=[[A.cx+(o.dx||0),A.y+A.h],[Bb.cx+(o.dx||0),Bb.y]];}
  else if(kind==='up'){pts=[[A.cx+(o.dx||0),A.y],[Bb.cx+(o.dx||0),Bb.y+Bb.h]];}
  else if(kind==='below'){const lane=rowBottom(o.row)+(o.lane||80);const sx=A.cx+(o.sdx||0),ex=Bb.cx+(o.edx||0);pts=[[sx,A.y+A.h],[sx,lane],[ex,lane],[ex,Bb.y+Bb.h]];}
  else if(kind==='side'){const lx=A.x+A.w+(o.dx||80);pts=[[A.x+A.w,ay],[lx,ay],[lx,by],[Bb.x+Bb.w,by]];}
  else if(kind==='above'){const lane=ry[o.row]-(o.lane||70);const sx=A.cx+(o.sdx||0),ex=Bb.cx+(o.edx||0);pts=[[sx,A.y],[sx,lane],[ex,lane],[ex,Bb.y]];}
  await arrow(sec,pts,label,o.dashed);}
 let maxX=0,maxY=0;for(const n of sec.children){maxX=Math.max(maxX,n.x+n.width);maxY=Math.max(maxY,n.y+n.height);}
 sec.resizeWithoutConstraints(maxX+120,maxY+140);return sec;}

const cust=await flow('Khách hàng · Đặt phòng online','Từ trang chủ đến giữ chỗ, thanh toán và quản lý đơn. Nét liền: luồng chính · Nét đứt: luồng phụ / quay lại.',0,[
 ['C06','Chi tiết chi nhánh',0,0,'Bấm một phòng / loại phòng → Chi tiết phòng (C08) hoặc Tìm phòng lọc sẵn.'],['C13','Hồ sơ cá nhân',1,0,'Từ menu avatar trên header.'],['C01','Đăng ký',2,0,'Đăng ký xong tự đăng nhập, quay lại trang trước (redirect).'],['C02','Đăng nhập',3,0,'Điều hướng theo role: Staff → Timeline (S01) · Admin → Dashboard (A01).'],['C03','Quên mật khẩu',4,0],['C04','Đặt lại mật khẩu',5,0],
 ['C05','Trang chủ',0,1],['C07a','Tìm phòng – Sơ đồ real-time',1,1],['C08','Chi tiết phòng',2,1],['C09','Checkout',3,1,'Giữ chỗ 10 phút. Hết giờ hoặc bấm “Bỏ giữ chỗ” → quay lại Tìm phòng.'],['C10','Kết quả thanh toán',4,1,'Thất bại còn hạn → “Thanh toán lại” qua VNPay.'],['C12','Chi tiết đặt phòng',5,1],['C12b','Modal hủy đặt phòng',6,1,'Xác nhận hủy → về Đặt phòng của tôi.'],
 ['C07b','Tìm phòng – Lưới',1,2],['C11','Đặt phòng của tôi',4,2,'Đơn HOLD: “Tiếp tục đặt” → Checkout (C09).'],['C12c','Modal đánh giá',5,2,'Chỉ với đơn COMPLETED, trong 7 ngày.']
],[
 ['C05','C06','up','Xem chi nhánh'],['C05','C07a','h','Tìm phòng'],['C06','C07a','h','Đặt phòng tại đây',{mx:-60}],['C05','C13','h','Header: Hồ sơ',{dashed:true,mx:60,ay:260}],
 ['C07a','C07b','v','Đổi chế độ xem',{dashed:true}],['C07a','C08','h','Xem phòng'],['C08','C09','h','Chọn phòng'],
 ['C07a','C09','above','Chọn phòng (sơ đồ / lưới) · giữ chỗ 10 phút',{row:1,lane:60,sdx:110,edx:-110}],
 ['C09','C07a','below','Bỏ giữ chỗ / hết giờ',{row:1,lane:40,sdx:-110,edx:110,dashed:true}],
 ['C08','C02','h','Chưa đăng nhập',{dashed:true,ay:260,mx:120}],['C02','C09','v','Đăng nhập xong · tự giữ chỗ'],['C02','C01','hl','Chưa có tài khoản',{dashed:true,ay:120,by:120}],['C01','C02','h','Đã có tài khoản',{dashed:true,ay:200,by:200}],['C02','C03','h','Quên mật khẩu',{dashed:true}],['C03','C04','h','Link trong email',{dashed:true}],['C04','C02','above','Đặt lại xong',{row:0,dashed:true}],
 ['C09','C10','h','Xác nhận · VNPay (qua cổng)'],['C09','C12','below','Xác nhận · Trả tại quầy',{row:1,sdx:60,edx:-90,lane:90}],['C10','C12','h','Xem đơn'],['C12','C12b','h','Hủy đặt phòng',{dashed:true}],['C12','C12c','v','Đánh giá',{dashed:true}],
 ['C05','C11','below','Header: Đặt phòng của tôi',{row:2,lane:90,dashed:true}],['C11','C12','h','Xem chi tiết',{mx:120}]
]);
const staff=await flow('Nhân viên quầy · Vận hành','Timeline → check-in → gọi món / gia hạn → check-out → hóa đơn.',cust.y+cust.height+200,[
 ['S01','Timeline phòng trong ngày',0,0],['S02','Modal khách vãng lai',1,0],['S03','Chi tiết đơn tại quầy',2,0,'CONFIRMED → nút Check-in; đang hát → gọi thêm món (drawer), gia hạn, check-out.'],['S03c','Modal gia hạn',3,0],
 ['S03b','Modal check-out & thu tiền',3,1],['S04','Hóa đơn (bản in)',4,1]
],[
 ['S01','S02','h','Khách vãng lai'],['S02','S03','h','Tạo & check-in'],['S01','S03','below','Bấm vào đơn',{row:0,lane:90,sdx:-60}],['S03','S03c','h','Gia hạn',{dashed:true}],['S03','S03b','h','Check-out',{ay:330,mx:60}],['S03b','S04','h','Thu tiền & in'],['S03','S04','below','In phiếu tạm tính / hóa đơn',{row:1,lane:40,sdx:110,edx:-110,dashed:true}],
 ['S04','S01','below','Đóng · phòng dọn 15 phút',{row:1,lane:90,edx:60,dashed:true}]
]);
const admin=await flow('Admin · Quản trị','Dashboard và các mục trên sidebar; mỗi mục quản lý dạng bảng + modal / drawer.',staff.y+staff.height+200,[
 ['A01','Dashboard',0,3],['A02','Chi nhánh',1,0],['A04','Loại phòng',1,1],['A05','Phòng',1,2],['A06','Bảng giá & ngày lễ',1,3],['A07','Menu',1,4],['A08','Voucher',1,5],['A09','Người dùng',1,6],['A10','Đặt phòng',1,7],
 ['A03','Trình chỉnh sơ đồ mặt bằng',2,0],['A08b','Modal tạo / sửa voucher',2,5],['A10b','Drawer chi tiết & hủy đơn',2,7]
],[
 ['A01','A02','h','Sidebar',{mx:100}],['A01','A04','h',null,{mx:100}],['A01','A05','h',null,{mx:100}],['A01','A06','h',null,{mx:100}],['A01','A07','h',null,{mx:100}],['A01','A08','h',null,{mx:100}],['A01','A09','h',null,{mx:100}],['A01','A10','h',null,{mx:100}],
 ['A02','A03','h','Icon sơ đồ'],['A04','A06','side','Thiết lập bảng giá ngay',{dashed:true,dx:80}],['A05','A10','side','Đơn bị ảnh hưởng',{dashed:true,dx:150,ay:200,by:200}],['A08','A08b','h','Tạo / sửa'],['A10','A10b','h','Xem đơn']
]);
return {cloned,sections:[cust.id,staff.id,admin.id],x0:X0};
