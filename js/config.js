/* config.js
   Book types, default company settings, logo path. */
const LOGO='assets/logo.png';
const T={invoice:{n:'Invoice',s:'Invoices',p:'INV',f:'Due date',st:['Unpaid','Paid','Overdue'],c:'#0f4c5c'},quotation:{n:'Quotation',s:'Quotations',p:'QUO',f:'Valid until',st:['Draft','Sent','Accepted','Declined'],c:'#a4501f'},receipt:{n:'Receipt',s:'Receipts',p:'REC',f:'Payment method',st:['Paid'],c:'#2d6e4a'},order:{n:'Purchase order',s:'Purchase orders',p:'PO',f:'Delivery date',st:['Open','Received','Cancelled'],c:'#5b3a8c'},delivery:{n:'Delivery note',s:'Delivery notes',p:'DN',f:'Delivered by',st:['Pending','Delivered'],c:'#8a2b3c'}};
const D={set:{name:'Your Company Ltd',tag:'Your tagline here',addr:'Maseru, Lesotho',phone:'',email:'',tax:15,cur:'M',sc:'#00525c',stc:'#ffffff',sty:'min',al:'left',logo:'',lh:'',wa:'',cc:'266',foot:'Thank you for your business.'},docs:{invoice:[],quotation:[],receipt:[],order:[],delivery:[]},clients:[]};
