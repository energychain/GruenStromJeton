﻿var call_delay=10000;

Number.prototype.format = function(n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&.');
};

gsi = {};
gsi.obj = [];
calls = [];
gsi.logs = [];
gsi.gas=20000;

function addLogMsg(tom,msg) {
	var logmsg = {}
	logmsg.msg = msg;
	logmsg.time = new Date().getTime();
	logmsg.tom = tom;
	gsi.logs.push(logmsg);
	$('#logTab').empty();
	for(var i=0;i<gsi.logs.length;i++) {
		var html="";
		html="<tr><td>";
		if(gsi.logs[i].tom=="info") {
			html+="<span class='label label-info'>Info</span>";
		}
		if(gsi.logs[i].tom=="error") {
			html+="<span class='label label-danger'>Fehler</span>";
		}
		html+="</td><td>";
		html+=new Date(gsi.logs[i].time).toLocaleString();
		html+="</td><td>";
		html+=gsi.logs[i].msg;
		html+="</td></tr>";
		$(html).prependTo('#logTab');
	}
	$('#alerter').show();
}
function openingWallet() {
	$.getJSON("./js/current.deployment.json",function(data) {
		gsi.deployment=data;
		$('#loadETH').attr('href','https://anycoindirect.eu/de/kaufen/ethers?discref=6c25dccb-1272-4668-8219-708427b66c39&address='+gsi.address);
		$('#recAddr').html(gsi.address);
		$.getJSON("./build/GSI.abi",function(abi_code) {
			gsi.obj.GSI = gsi.wallet.getContract(gsi.deployment.gsi,abi_code);
			$.getJSON("./build/GSIToken.abi",function(token_abi) {
				gsi.obj.GSI.greenToken().then(function(r) {
						gsi.obj.greenToken=gsi.wallet.getContract(r[0],token_abi);
						gsi.obj.greenToken.balanceOf(gsi.address).then(function(v) {
							$('.balance-green').html((v.toString()*1).format());
							$('#sendTokens').attr('placeholder','Max: '+(v.toString()*1));
						});
				});
				gsi.obj.GSI.greyToken().then(function(r) {
						gsi.obj.greyToken=gsi.wallet.getContract(r[0],token_abi);
						gsi.obj.greyToken.balanceOf(gsi.address).then(function(v) {
							$('.balance-gray').html((v.toString()*1).format());
						});
				});
				gsi.wallet.getBalance().then(function(r) {
						$('#ethbalance').html((r.toString().substr(0,r.toString().length-6)/10000).format());
						if((r.toString().substr(0,r.toString().length-6)/10000)<10000+gsi.gas) {
							if(!gsi.hasBalanceError) {
							addLogMsg('error','<strong>Guthaben für Transaktionen zu nieder.</strong><br/> Aufladung notwendig, um Zählerstand zu aktualisieren, Postleitzahl zu setzen oder Jetons zu transferieren. Bitte wenden Sie sich an Ihren Messstellenbetreiber für weitere Informationen zur Aufladung und Freischaltung von Transaktionen.');
							gsi.hasBalanceError=true;
							}
						}
				});
				$('.gsiactive').html(gsi.address.substr(0,30)+"...");
				$('.gsiactive').attr('title',gsi.address);
				gsi.obj.GSI.lastReading(gsi.address).then(function(r) {
					console.log(r);
					if(r[2].length==5) {
						$('#requestedPLZ').val(r[2]);
						$('#requestedPLZ').attr('disabled','true');
						$('#gsiimg').attr('src','http://mix.stromhaltig.de/gsi/nachhaltig/img/'+r[2]+'.png');
						$('#gsiimg').show();
						gsi.plz=r[2];
					}
				});
				gsi.obj.GSI.requestReading(gsi.address).then(function(r) {
					console.log(r);
					if(r[2].length==5) {
						$('#requestedReading').val(r[1].toString());
						$('#requestedPLZ').val(r[2]);
						$('#requestedPLZ').attr('disabled','true');
						$('#gsiimg').attr('src','http://mix.stromhaltig.de/gsi/nachhaltig/img/'+r[2]+'.png');
						$('#gsiimg').show();
						gsi.plz=r[2];
					}
				});
				gsi.obj.GSI.requiredGas().then(function(x) {gsi.gas=x[0].toString()*1;});
			});
		});
	});
	$('#doRequest').click(function() {
		$('#doRequested').attr('disabled','true');
		if($('#requestedPLZ').val()!=gsi.plz) {
			if($('#requestedPLZ').val().length==5) {
				gsi.obj.GSI.setPlz($('#requestedPLZ').val()).then(function(e) {console.log(e);
				addLogMsg('info','<strong>Transaktion '+e+' gesendet.</strong><br/> Der Status der Verarbeitung kann bei <a href="http://etherscan.io/tx/'+e+'" target="_blank">Etherscan.io</a> kontrolliert werden.');
				});
			} else {
				addLogMsg('error','<strong>Postleitzahl ungültig</strong><br/>Es können nur Postleitzahlen in Deutschland verwendet werden.');
			}
		}
		var options = {
			value:gsi.gas
		};
		gsi.obj.GSI.oracalizeReading($('#requestedReading').val()*1,options).then(function(e)  {
			addLogMsg('info','<strong>Transaktion '+e+' gesendet.</strong><br/> Der Status der Verarbeitung kann bei <a href="http://etherscan.io/tx/'+e+'" target="_blank">Etherscan.io</a> kontrolliert werden.');
			$('#doRequested').attr('disabled','false');
		});
	});
	$('#doSend').click(function() {
		var options = {
			gasLimit: 3000000,
			gasPrice: "0x1000",
		};
		gsi.obj.greenToken.transfer($('#sendTo').val(),$('#sendTokens').val()*1,options).then(function(e) {
			addLogMsg('info','<strong>Transaktion '+e+' gesendet.</strong><br/> Der Status der Verarbeitung kann bei <a href="http://etherscan.io/tx/'+e+'" target="_blank">Etherscan.io</a> kontrolliert werden.');
			$('#sendTo').val("");
			$('#sendTokens').val("");
		});
	});
	if(!gsi.c) {
	gsi.c=setInterval(function() {
									openingWallet();
								},60000);
	}
}
var isNew=false;

function unlockedWallet() {
	$('#closedWallet').hide();
	openingWallet();
	$('#openWallet').show();
}
function doNew() {

					//var pk = chrome.storage.sync.get("pk");
					var array = new  Uint16Array(32);
					var pk = new Wallet.utils.Buffer(window.crypto.getRandomValues(array));

					gsi.wallet = new Wallet(pk, new Wallet.providers.EtherscanProvider({testnet: false}));
					chrome.storage.sync.set({"address":gsi.wallet.address,"pk":gsi.wallet.privateKey},function(o) {});



					gsi.address=gsi.wallet.address;
					unlockedWallet();


}
$(document).ready(
	function() {

		chrome.storage.sync.get("pk",function(seed) {
			if(seed.pk) {
			$('#seedIn').val(seed.pk);
			$('#hasID').show();
			} else $('#hasID').hide();
		});






		$('#closedWallet').show();

		$('#doOpen').click(function() {

			chrome.storage.sync.get("pk",function(seed) {
				gsi.wallet=new Wallet(seed.pk, new Wallet.providers.EtherscanProvider({testnet: false}));
				gsi.address=gsi.wallet.address;
				console.log(gsi.address);
				unlockedWallet();
			});
		});
		$('#doImport').click(function() {
			chrome.storage.sync.set({"pk":$('#keyIn').val()},function(o) {});
			gsi.wallet=new Wallet($('#keyIn').val(), new Wallet.providers.EtherscanProvider({testnet: false}));
			//chrome.storage.sync.set("address",gsi.wallet.address);
			gsi.address=gsi.wallet.address;
			unlockedWallet();
		});
		$('#doNew').click(function() {
			doNew();
		});
	}
);

