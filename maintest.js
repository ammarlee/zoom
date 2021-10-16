// let myset = new Set([1,2,4,5,1,2]);
// myset.add('ammar')
// myset.add('ammar2')
// myset.add('ammar5')
// myset.delete('ammar')
// console.log(myset.has("ammar"));
// myset.forEach((i,l)=>{
//   console.log({i,l});
// })

// console.log(myset.size);
// let mymap = new Map([
//   [name,"ammar"],
//   [60,'number'],
//   [false,true],

// ]);
// console.log(mymap);
// console.log(mymap.get(60));
// console.log(mymap.clear());

let namesd = "ahmed mohamsed";
console.log(namesd.includes("s"));

// let t = namesd[Symbol.iterator]()
// console.log(t.next());
// console.log(t.next());
// console.log(t.next());
// console.log(t.next());
// console.log(t.next());
// console.log(t.next());
// console.log(namesd[Symbol.iterator]());
// let mysymbol = Symbol("asd")

// let mysymbo2 = Symbol("asd")
// console.log(mysymbol === mysymbo2);
// console.log(mysymbo2);
// axios is making a promise but if i wanna make it by myself i can make it
// let url = "https://jsonplaceholder.typicode.com/todos/1";
// let promise = new Promise((resolve, reject) => {
//   let resp = new XMLHttpRequest();
//   resp.onreadystatechange = function () {
//     if (this.status === 200 && this.readyState === 4) {
//       resolve(JSON.parse(this.responseText))
//     } else {
//       reject(Error("false"));
//     }
//     /* ... */
//   };
//   resp.open("GET", url, true);
//   resp.send();
// });
// promise
//   .then((res) => console.log(res))
//   .catch((err) => {
//     console.log(err);
// //   });
// let num = "01060612342"
// let len = num.length
// let f1 = num.slice(0,4)
// let f2 = num.slice(-2)
// let res = f2.padStart(len-3,"*")
// console.log(f1.concat(res));

let bob =function(num,str){
  console.log(`bob >>> ${num} || ${str} || ${this}`);
  console.log(this);
  return true
}
let bill = {
  name:'wee',
  myname:function(fn){
    console.log({arguments});
    fn.apply(bill,[arguments[1],arguments[2]])
  }
}
// bob.call(bill,'one','22')
// bob.apply(bill,['one','22'])
bill.myname(bob,'ammar',55)