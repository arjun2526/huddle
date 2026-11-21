import React,{useEffect,useState,useCallback,useRef} from 'react';
import {View,Text,TextInput,TouchableOpacity as T,FlatList,Image,ScrollView,useWindowDimensions,StyleSheet,Platform,Alert,ActivityIndicator} from 'react-native';
import * as IP from 'expo-image-picker';
import {Video,ResizeMode} from 'expo-av';
import {sb} from './src/supabase';

const C={bg:'#F6F5FF',card:'#FFFFFF',line:'#E3E0F5',ink:'#1B1740',dim:'#7A76A0',blue:'#4B3BFF',coral:'#FF6A5C'};
const msg=t=>Platform.OS==='web'?window.alert(t):Alert.alert('HUDDLE',t);
const ago=d=>{const s=(Date.now()-new Date(d))/1000;return s<60?'now':s<3600?~~(s/60)+'m':s<86400?~~(s/3600)+'h':~~(s/86400)+'d'};
const Av=({u,s=36})=>u?.avatar_url?<Image source={{uri:u.avatar_url}} style={{width:s,height:s,borderRadius:s/2}}/>:<View style={{width:s,height:s,borderRadius:s/2,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#fff',fontWeight:'800',fontSize:s/2.4}}>{(u?.username||'?')[0].toUpperCase()}</Text></View>;
const Media=({p,play,h})=>p.media_type==='video'
  ?<Video source={{uri:p.media_url}} style={{width:'100%',height:h}} resizeMode={ResizeMode.COVER} isLooping shouldPlay={!!play} useNativeControls={play===undefined}/>
  :<Image source={{uri:p.media_url}} style={{width:'100%',height:h}} resizeMode="cover"/>;
const toggleLike=async(p,me)=>{const l=p.likes.some(x=>x.user_id===me.id);l?await sb.from('likes').delete().match({post_id:p.id,user_id:me.id}):await sb.from('likes').insert({post_id:p.id})};
const POSTQ='*,profiles(id,username,avatar_url),likes(user_id),comments(count)';

function Auth(){
  const[m,setM]=useState('in'),[e,setE]=useState(''),[u,setU]=useState(''),[p,setP]=useState(''),[b,setB]=useState(false);
  const go=async()=>{
    if(m==='up'&&!/^[a-z0-9_.]{3,20}$/i.test(u))return msg('Username must be 3-20 letters, numbers, dots or underscores.');
    if(p.length<8)return msg('Password must be at least 8 characters.');
    setB(true);
    const r=m==='in'?await sb.auth.signInWithPassword({email:e.trim(),password:p}):await sb.auth.signUp({email:e.trim(),password:p,options:{data:{username:u.toLowerCase().trim()}}});
    setB(false);
    if(r.error)msg(r.error.message);else if(m==='up'&&!r.data.session)msg('Account created. Confirm your email, then log in.');
  };
  return <View style={[st.c,{alignItems:'center',justifyContent:'center'}]}><View style={st.auth}>
    <Text style={st.logoBig}>huddle</Text><Text style={[st.dim,{marginBottom:20}]}>Photos, reels and chats with your people.</Text>
    <TextInput style={st.in} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={e} onChangeText={setE}/>
    {m==='up'&&<TextInput style={st.in} placeholder="Username" autoCapitalize="none" value={u} onChangeText={setU}/>}
    <TextInput style={st.in} placeholder="Password" secureTextEntry value={p} onChangeText={setP}/>
    <T style={st.btn} onPress={go} disabled={b}>{b?<ActivityIndicator color="#fff"/>:<Text style={st.btnT}>{m==='in'?'Log in':'Create account'}</Text>}</T>
    <T onPress={()=>setM(m==='in'?'up':'in')}><Text style={[st.dim,{marginTop:16,textAlign:'center'}]}>{m==='in'?"New here? Sign up":'Have an account? Log in'}</Text></T>
  </View></View>;
}

function Post({p,me,open,reload}){
  const[cm,setCm]=useState(null),[tx,setTx]=useState('');
  const liked=p.likes.some(l=>l.user_id===me.id);
  const lc=async()=>{const{data}=await sb.from('comments').select('*,profiles(username)').eq('post_id',p.id).order('created_at');setCm(data||[])};
  const send=async()=>{if(!tx.trim())return;await sb.from('comments').insert({post_id:p.id,body:tx.trim()});setTx('');lc();reload()};
  const del=async()=>{await sb.from('posts').delete().eq('id',p.id);reload()};
  return <View style={st.post}>
    <T style={st.row} onPress={()=>open(p.profiles.id)}><Av u={p.profiles} s={34}/><Text style={st.name}>{p.profiles.username}</Text><Text style={st.dim}>  {ago(p.created_at)}</Text>
      {p.user_id===me.id&&<T style={{marginLeft:'auto'}} onPress={del}><Text style={st.dim}>Delete</Text></T>}</T>
    <Media p={p} h={440}/>
    <View style={st.row}><T onPress={async()=>{await toggleLike(p,me);reload()}}><Text style={{fontSize:26,color:liked?C.coral:C.ink}}>{liked?'♥':'♡'}</Text></T>
      <Text style={st.name}> {p.likes.length}</Text><T style={{marginLeft:18}} onPress={()=>cm?setCm(null):lc()}><Text style={st.name}>💬 {p.comments[0]?.count||0}</Text></T></View>
    {!!p.caption&&<Text style={st.cap}><Text style={st.name}>{p.profiles.username} </Text>{p.caption}</Text>}
    {cm&&<View style={{padding:12}}>{cm.map(c=><Text key={c.id} style={{marginBottom:4,color:C.ink}}><Text style={st.name}>{c.profiles?.username} </Text>{c.body}</Text>)}
      <View style={st.row}><TextInput style={[st.in,{flex:1,marginBottom:0}]} placeholder="Add a comment" value={tx} onChangeText={setTx} onSubmitEditing={send}/><T onPress={send}><Text style={[st.name,{color:C.blue,marginLeft:10}]}>Post</Text></T></View></View>}
  </View>;
}

function Feed({me,open}){
  const[r,setR]=useState([]);
  const load=useCallback(async()=>{const{data}=await sb.from('posts').select(POSTQ).eq('is_reel',false).order('created_at',{ascending:false}).limit(50);setR(data||[])},[]);
  useEffect(()=>{load()},[]);
  return <FlatList data={r} keyExtractor={x=>''+x.id} onRefresh={load} refreshing={false}
    ListHeaderComponent={<Text style={st.logo}>huddle</Text>}
    ListEmptyComponent={<Text style={[st.dim,{padding:24}]}>Nothing here yet. Tap Create and share the first photo.</Text>}
    renderItem={({item})=><Post p={item} me={me} open={open} reload={load}/>}/>;
}

function Reels({me,open}){
  const{height}=useWindowDimensions();const H=height-70;
  const[r,setR]=useState([]),[a,setA]=useState(0);
  const load=useCallback(async()=>{const{data}=await sb.from('posts').select(POSTQ).eq('is_reel',true).order('created_at',{ascending:false}).limit(30);setR(data||[])},[]);
  useEffect(()=>{load()},[]);
  const vc=useRef(({viewableItems})=>{if(viewableItems[0])setA(viewableItems[0].index)}).current;
  if(!r.length)return <Text style={[st.dim,{padding:24}]}>No reels yet. Create one from a video.</Text>;
  return <FlatList data={r} keyExtractor={x=>''+x.id} pagingEnabled snapToInterval={H} decelerationRate="fast" onViewableItemsChanged={vc} viewabilityConfig={{itemVisiblePercentThreshold:80}} getItemLayout={(_,i)=>({length:H,offset:H*i,index:i})}
    renderItem={({item,index})=>{const liked=item.likes.some(l=>l.user_id===me.id);return <View style={{height:H,backgroundColor:'#000'}}>
      <Media p={item} play={index===a} h={H}/>
      <View style={st.ov}><T onPress={()=>open(item.profiles.id)}><Text style={st.ovT}>@{item.profiles.username}</Text></T><Text style={{color:'#fff'}}>{item.caption}</Text></View>
      <T style={st.side2} onPress={async()=>{await toggleLike(item,me);load()}}><Text style={{fontSize:34,color:liked?C.coral:'#fff'}}>{liked?'♥':'♡'}</Text><Text style={{color:'#fff',fontWeight:'700'}}>{item.likes.length}</Text></T>
    </View>}}/>;
}

function Create({me,done}){
  const[f,setF]=useState(null),[cap,setCap]=useState(''),[reel,setReel]=useState(false),[b,setB]=useState(false);
  const pick=async()=>{const r=await IP.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:0.8});if(!r.canceled)setF(r.assets[0])};
  const post=async()=>{
    if(!f)return msg('Pick a photo or video first.');
    setB(true);
    try{
      const v=f.type==='video';const path=`${me.id}/${Date.now()}.${v?'mp4':'jpg'}`;
      const buf=await(await fetch(f.uri)).arrayBuffer();
      const u=await sb.storage.from('media').upload(path,buf,{contentType:v?'video/mp4':'image/jpeg'});if(u.error)throw u.error;
      const url=sb.storage.from('media').getPublicUrl(path).data.publicUrl;
      const i=await sb.from('posts').insert({media_url:url,media_type:v?'video':'image',caption:cap,is_reel:reel&&v});if(i.error)throw i.error;
      done();
    }catch(e){msg(e.message)}
    setB(false);
  };
  return <ScrollView contentContainerStyle={{padding:16}}><Text style={st.h}>Create</Text>
    <T style={st.pick} onPress={pick}>{f?(f.type==='video'?<Text style={st.name}>Video selected</Text>:<Image source={{uri:f.uri}} style={{width:'100%',height:300}} resizeMode="cover"/>):<Text style={st.dim}>Tap to choose a photo or video</Text>}</T>
    <TextInput style={st.in} placeholder="Write a caption" value={cap} onChangeText={setCap}/>
    <T style={st.row} onPress={()=>setReel(!reel)}><Text style={{fontSize:20}}>{reel?'☑':'☐'}</Text><Text style={st.name}>  Share as a reel (videos only)</Text></T>
    <T style={[st.btn,{marginTop:16}]} onPress={post} disabled={b}>{b?<ActivityIndicator color="#fff"/>:<Text style={st.btnT}>Share</Text>}</T></ScrollView>;
}

function Thread({me,w,back}){
  const[m,setM]=useState([]),[tx,setTx]=useState('');
  const load=async()=>{const{data}=await sb.from('messages').select('*').or(`and(sender.eq.${me.id},receiver.eq.${w.id}),and(sender.eq.${w.id},receiver.eq.${me.id})`).order('created_at');setM(data||[])};
  useEffect(()=>{load();const ch=sb.channel('dm-'+me.id+'-'+w.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},load).subscribe();return()=>{sb.removeChannel(ch)}},[]);
  const send=async()=>{if(!tx.trim())return;const t=tx.trim();setTx('');const{error}=await sb.from('messages').insert({receiver:w.id,body:t});if(error)msg(error.message);load()};
  return <View style={{flex:1}}><View style={[st.row,{borderBottomWidth:1,borderColor:C.line}]}><T onPress={back}><Text style={{fontSize:22,marginRight:12}}>‹</Text></T><Av u={w} s={30}/><Text style={st.name}>{w.username}</Text></View>
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:12}}>{m.map(x=><View key={x.id} style={[st.bub,x.sender===me.id?st.mine:st.theirs]}><Text style={{color:x.sender===me.id?'#fff':C.ink}}>{x.body}</Text></View>)}</ScrollView>
    <View style={[st.row,{borderTopWidth:1,borderColor:C.line}]}><TextInput style={[st.in,{flex:1,marginBottom:0}]} placeholder="Message" value={tx} onChangeText={setTx} onSubmitEditing={send}/><T onPress={send}><Text style={[st.name,{color:C.blue,marginLeft:10}]}>Send</Text></T></View></View>;
}

function Chat({me,open}){
  const[q,setQ]=useState(''),[u,setU]=useState([]),[w,setW]=useState(null);
  useEffect(()=>{let x=sb.from('profiles').select('id,username,avatar_url').neq('id',me.id).limit(50);if(q)x=x.ilike('username',`%${q}%`);x.then(({data})=>setU(data||[]))},[q]);
  if(w)return <Thread me={me} w={w} back={()=>setW(null)}/>;
  return <View style={{flex:1}}><Text style={st.h}>Messages</Text><TextInput style={[st.in,{marginHorizontal:16}]} placeholder="Search people" autoCapitalize="none" value={q} onChangeText={setQ}/>
    <FlatList data={u} keyExtractor={x=>x.id} ListEmptyComponent={<Text style={[st.dim,{padding:24}]}>No one found. Invite a friend to sign up.</Text>}
      renderItem={({item})=><View style={st.row}><T onPress={()=>open(item.id)}><Av u={item} s={42}/></T><T style={{flex:1}} onPress={()=>setW(item)}><Text style={st.name}>{item.username}</Text><Text style={st.dim}>Tap to message</Text></T></View>}/></View>;
}

function Profile({me,id,back,open}){
  const[u,setU]=useState(null),[ps,setPs]=useState([]),[n,setN]=useState({a:0,b:0}),[fo,setFo]=useState(false),[bio,setBio]=useState('');
  const mine=id===me.id;const{width}=useWindowDimensions();const g=Math.min(width,520)/3;
  const load=async()=>{
    const[a,b,c,d,e]=await Promise.all([sb.from('profiles').select('*').eq('id',id).single(),sb.from('posts').select('*').eq('user_id',id).order('created_at',{ascending:false}),
      sb.from('follows').select('*',{count:'exact',head:true}).eq('following',id),sb.from('follows').select('*',{count:'exact',head:true}).eq('follower',id),sb.from('follows').select('follower').eq('follower',me.id).eq('following',id)]);
    setU(a.data);setBio(a.data?.bio||'');setPs(b.data||[]);setN({a:c.count||0,b:d.count||0});setFo((e.data||[]).length>0);
  };
  useEffect(()=>{load()},[id]);
  const tf=async()=>{fo?await sb.from('follows').delete().match({follower:me.id,following:id}):await sb.from('follows').insert({following:id});load()};
  const sv=async()=>{const{error}=await sb.from('profiles').update({bio}).eq('id',me.id);msg(error?error.message:'Bio saved.')};
  if(!u)return <ActivityIndicator style={{marginTop:40}} color={C.blue}/>;
  return <ScrollView>{back&&<T onPress={back}><Text style={[st.name,{padding:14}]}>‹ Back</Text></T>}
    <View style={{padding:16,alignItems:'center'}}><Av u={u} s={84}/><Text style={[st.h,{padding:6}]}>{u.username}</Text>
      <Text style={st.name}>{ps.length} posts   {n.a} followers   {n.b} following</Text>
      {mine?<><TextInput style={[st.in,{width:'100%',marginTop:12}]} placeholder="Your bio" value={bio} onChangeText={setBio}/><View style={st.row}><T style={[st.btn,{paddingHorizontal:20}]} onPress={sv}><Text style={st.btnT}>Save bio</Text></T><T style={[st.btn,{backgroundColor:C.ink,marginLeft:10,paddingHorizontal:20}]} onPress={()=>sb.auth.signOut()}><Text style={st.btnT}>Log out</Text></T></View></>
      :<><Text style={[st.dim,{marginTop:6}]}>{u.bio}</Text><T style={[st.btn,{marginTop:12,paddingHorizontal:30,backgroundColor:fo?C.dim:C.blue}]} onPress={tf}><Text style={st.btnT}>{fo?'Following':'Follow'}</Text></T></>}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{ps.map(p=><View key={p.id} style={{width:g,height:g,padding:1}}>{p.media_type==='video'?<View style={st.tile}><Text style={{color:'#fff',fontSize:24}}>▶</Text></View>:<Image source={{uri:p.media_url}} style={{flex:1}}/>}</View>)}</View></ScrollView>;
}

function Shell({me}){
  const{width}=useWindowDimensions();const d=width>=900;
  const[t,setT]=useState('home'),[pid,setPid]=useState(null);
  const nav=[['home','⌂','Home'],['reels','▶','Reels'],['add','＋','Create'],['chat','✉','Messages'],['me','☺','Profile']];
  const go=k=>{setPid(null);setT(k)};
  const body=pid?<Profile me={me} id={pid} back={()=>setPid(null)} open={setPid}/>:t==='home'?<Feed me={me} open={setPid}/>:t==='reels'?<Reels me={me} open={setPid}/>:t==='add'?<Create me={me} done={()=>go('home')}/>:t==='chat'?<Chat me={me} open={setPid}/>:<Profile me={me} id={me.id} open={setPid}/>;
  return <View style={[st.c,{flexDirection:d?'row':'column'}]}>
    {d&&<View style={st.side}><Text style={[st.logo,{paddingLeft:0}]}>huddle</Text>{nav.map(([k,i,l])=><T key={k} style={st.sideI} onPress={()=>go(k)}><Text style={{fontSize:20,width:30}}>{i}</Text><Text style={[st.nameL,t===k&&!pid&&{color:C.blue}]}>{l}</Text></T>)}</View>}
    <View style={{flex:1,alignItems:'center'}}><View style={{flex:1,width:'100%',maxWidth:d?520:undefined,backgroundColor:d?C.card:undefined,borderLeftWidth:d?1:0,borderRightWidth:d?1:0,borderColor:C.line}}>{body}</View></View>
    {!d&&<View style={st.bar}>{nav.map(([k,i])=><T key={k} style={{padding:8}} onPress={()=>go(k)}><Text style={{fontSize:24,color:t===k&&!pid?C.blue:C.dim}}>{i}</Text></T>)}</View>}
  </View>;
}

export default function App(){
  const[s,setS]=useState(undefined);
  useEffect(()=>{sb.auth.getSession().then(({data})=>setS(data.session));const{data}=sb.auth.onAuthStateChange((_,x)=>setS(x));return()=>data.subscription.unsubscribe()},[]);
  if(s===undefined)return <View style={[st.c,{justifyContent:'center'}]}><ActivityIndicator color={C.blue}/></View>;
  return s?<Shell me={s.user}/>:<Auth/>;
}

const st=StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},logo:{fontSize:30,fontWeight:'900',letterSpacing:-1.5,color:C.blue,padding:14},logoBig:{fontSize:52,fontWeight:'900',letterSpacing:-3,color:C.blue},
  h:{fontSize:24,fontWeight:'800',color:C.ink,padding:16},dim:{color:C.dim},name:{fontWeight:'700',color:C.ink},nameL:{fontWeight:'700',fontSize:17,color:C.ink},
  row:{flexDirection:'row',alignItems:'center',padding:12},post:{backgroundColor:C.card,borderBottomWidth:1,borderColor:C.line,marginBottom:10},cap:{paddingHorizontal:12,paddingBottom:12,color:C.ink},
  in:{backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:10,padding:12,marginBottom:10,color:C.ink},btn:{backgroundColor:C.blue,borderRadius:10,padding:14,alignItems:'center'},btnT:{color:'#fff',fontWeight:'800'},
  auth:{width:'100%',maxWidth:380,padding:24},pick:{height:300,backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderStyle:'dashed',borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:12,overflow:'hidden'},
  bub:{maxWidth:'75%',padding:10,borderRadius:14,marginBottom:6},mine:{backgroundColor:C.blue,alignSelf:'flex-end'},theirs:{backgroundColor:C.line,alignSelf:'flex-start'},
  ov:{position:'absolute',left:14,bottom:20,right:80},ovT:{color:'#fff',fontWeight:'800',fontSize:17},side2:{position:'absolute',right:14,bottom:40,alignItems:'center'},
  bar:{flexDirection:'row',justifyContent:'space-around',borderTopWidth:1,borderColor:C.line,backgroundColor:C.card,paddingBottom:Platform.OS==='ios'?18:4},
  side:{width:240,padding:20,borderRightWidth:1,borderColor:C.line,backgroundColor:C.card},sideI:{flexDirection:'row',alignItems:'center',paddingVertical:14},tile:{flex:1,backgroundColor:C.ink,alignItems:'center',justifyContent:'center'}
});
