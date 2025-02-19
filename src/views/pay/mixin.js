import { mapGetters, mapState } from "vuex";
import { providers, BigNumber } from "ethers"; //, utils
import ethContract from "../../plugins/pay/contracts/src-chain-contracts";
import bscContract from "../../plugins/pay/contracts/src-chain-contracts-bsc";
import polygonContract from "../../plugins/pay/contracts/dst-chain-contracts";
import ArbitrumContract from "../../plugins/pay/contracts/src-chain-contracts-arbitrum";
import zkSyncContract from "../../plugins/pay/contracts/src-chain-contracts-zkSync";
// import client from "../../plugins/pay/contracts/SGNClient";
import {
  MumbaiFundPool,
  ChapelRecharge,
  GoerliRecharge,
  providerAddr,
} from "../../plugins/pay/contracts/contracts-addr";
import { Web3Provider } from "zksync-web3";
const uint256Max = BigNumber.from("1").shl(256).sub(1);

export default {
  data() {
    return {
      curContract: null,
      isApproved: false,
      approving: false,
      providerAddr,
      // client,
      walletBalance: 0,
      balance: null,
      allowance: null,
    };
  },
  computed: {
    ...mapState({
      connectAddr: (s) => s.connectAddr,
      netType: (s) => s.netType,
      chainId: (s) => s.chainId,
      payBy: (s) => s.payBy,
      userInfo: (s) => s.userInfo,
    }),
    ...mapGetters(["teamInfo", "walletObj"]),
    uuid() {
      if (this.teamInfo.isMember) return this.teamInfo.teamOwnerEuid;
      return this.userInfo.euid;
    },
    isPolygon() {
      return this.payBy == "Polygon";
    },
    isBSC() {
      return this.payBy == "BSC";
    },
    isEth() {
      return this.payBy == "Ethereum";
    },
    isArbitrum() {
      return this.payBy == "Arbitrum";
    },
    isZk() {
      return this.payBy == "zkSync";
    },
    isEverPay() {
      return this.payBy == "everPay";
    },
    payChainId() {
      return this.getChainId(this.payBy);
    },
    usdcKey() {
      return this.isPolygon ? "MumbaiUSDC" : "GoerliUSDC";
    },
    chainKey() {
      return this.isPolygon ? "DstChainPayment" : "SrcChainPayment";
    },
    payAddr() {
      if (!this.curContract) return "";
      return this.curContract[this.chainKey].address;
    },
    rechargeAddr() {
      let addrList = [
        { addr: GoerliRecharge, chainIdArr: [1, 5] },
        { addr: MumbaiFundPool, chainIdArr: [137, 80001] },
        { addr: ChapelRecharge, chainIdArr: [56, 97] },
      ];
      const addrItem = addrList.find((it) =>
        it.chainIdArr.includes(this.chainId)
      );
      return addrItem.addr;
    },
  },
  watch: {
    connectAddr(val) {
      if (val) this.onConnect();
    },
    payBy(val) {
      if (val) {
        this.onConnect();
      }
    },
    // payChainId() {
    //   this.onConnect();
    // },
  },
  mounted() {
    if (this.connectAddr) {
      this.onConnect();
    } else {
      this.showConnect();
    }
  },
  methods: {
    walletChanged(isInit) {
      if (!this.connectAddr) {
        this.showConnect();
        return true;
      }
      const { address = "" } = this.userInfo.wallet || {};
      if (!isInit) {
        if (!address) {
          if (this.userInfo.solana || this.userInfo.onFlow) {
            this.$alert(
              "Currently this feature only supports MetaMask wallet."
            );
          } else {
            this.$confirm(
              "This function requires MetaMask wallet binding.",
              "Wallet Binding",
              {
                // confirmText: 'Connnect',
              }
            ).then(() => {
              this.$router.push("/settings?tab=account_binding");
            });
          }
          return true;
        }
      }
      const isChanged =
        address && this.connectAddr.toLowerCase() != address.toLowerCase();
      if (isChanged) {
        const msg =
          "The wallet account has been changed, switch 4EVERLAND account now?";
        this.$confirm(msg, "Wallet Changed", {
          confirmText: "Switch Account",
        }).then(() => {
          this.$clearLogin();
          location.href = "index.html";
        });
      }
      return isChanged;
    },
    onErr(err, retry) {
      if (!err) return console.log("---- err null");
      console.log(err);
      const { data } = err;
      let msg = err.message;
      if (data) {
        msg = data.message || msg;
      }
      if (/repriced/i.test(msg) && /replaced/i.test(msg)) {
        return this.$toast("Transaction was replaced.");
      }
      window.gtag("event", "contract_error", {
        message: msg,
      });
      if (/missing revert data/i.test(msg)) {
        msg = "Network Error";
      } else if (/user rejected/i.test(msg)) {
        msg = "Your transaction has been canceled.";
      } else if (/transaction failed/i.test(msg)) {
        msg = "Transaction Failed";
      } else if (/ipfs/.test(msg) && /invalid params/.test(msg)) {
        msg = "IPFS Storage Expired, extending service duration is required.";
      } else if (/exceeds balance/i.test(msg) || msg == "overflow") {
        msg = "Insufficient balance";
      } else if (msg.length > 100) {
        const mat = /^(.+)\[/.exec(msg);
        if (mat) msg = mat[1];
      }
      if (/already pending for origin/gi.test(msg)) {
        msg = "Wrong network, please switch your wallet network and try again.";
      }
      if (retry) {
        return this.$confirm(msg, "Network Error", {
          confirmText: "Retry",
        });
      }
      return this.$alert(msg);
    },
    async getBalance() {
      const {
        data: { balance },
      } = await this.$http.get("$v3/account/balance");
      this.balance = this.$utils.cutFixed(balance, 4);
    },
    async getWalletBalance() {
      this.$loading();
      const num = await this.curContract[this.usdcKey].balanceOf(
        this.connectAddr
      );
      // console.log(num.toNumber());
      let curAmountDecimals = await this.curContract[this.usdcKey].decimals();
      curAmountDecimals = curAmountDecimals.toNumber();
      console.log(curAmountDecimals);
      this.walletBalance = this.$utils.cutFixed(
        num / 10 ** curAmountDecimals,
        4
      );
      // console.log(this.walletBalance);
      this.$loading.close();
    },
    async checkAccount() {
      console.log("check account...");
      console.log(this.providerAddr, this.uuid);
      const uuidRegistered =
        await this.curContract.ProviderController.accountExists(
          this.providerAddr,
          this.uuid
        );
      console.log("account uuidRegistered", uuidRegistered);
      return uuidRegistered;
    },
    async checkApprove(isBuy) {
      console.log(isBuy);
      // return (this.isApproved = false);
      if (
        isBuy &&
        this.payBy == "everPay" &&
        (this.chainId == 1 || this.chainId == 5)
      ) {
        return (this.isApproved = true);
      }
      try {
        const addr = isBuy ? this.payAddr : this.rechargeAddr;
        console.log("check approve", this.connectAddr, addr);
        if (!this.connectAddr) return console.log("no connectAddr");
        console.log(this.curContract[this.usdcKey], this.connectAddr, addr);
        const allowance = await this.curContract[this.usdcKey].allowance(
          this.connectAddr,
          addr
        );
        console.log(allowance, "allowance");
        this.isApproved = allowance.eq(uint256Max);

        // if (!amount) {
        //   this.isApproved = allowance.eq(uint256Max);
        //   return;
        // }

        // this.isApproved = allowance.gte(amount);

        console.log("isApproved", this.isApproved, allowance);
      } catch (error) {
        console.log("check approve error");
        this.onErr(error);
      }
    },
    async onApprove(isBuy) {
      try {
        if (!this.checkPayBy()) return;
        this.$loading("Approving");
        // this.approving = true;
        const addr = isBuy ? this.payAddr : this.rechargeAddr;
        console.log("approve", addr, this.usdcKey);
        const target = this.curContract[this.usdcKey];
        let gas = await target.estimateGas.approve(addr, uint256Max);
        console.log("gas", gas);
        let gasPrice = await this.curContract.provider.getGasPrice();
        const tx = await target.approve(addr, uint256Max, {
          gasLimit: gas.mul(15).div(10),
          gasPrice: gasPrice.mul(12).div(10),
        });
        console.log("tx", tx);
        const receipt = await tx.wait();
        console.log(receipt);
        // this.isApproved = true;

        this.$loading.close();
        this.$toast("Approved successfully");
      } catch (error) {
        console.log("on approve error");
        this.onErr(error);
      }
    },
    formatToken(value, fixed = 2, decimals = 18) {
      // console.log(value.toString());
      const v = value.div(
        BigNumber.from((10 ** (decimals - fixed)).toString())
      );
      return (v.toNumber() / 10 ** fixed).toFixed(fixed);
    },
    showConnect() {
      this.$setMsg({
        name: "showMetaConnect",
      });
    },
    checkPayBy() {
      if (!this.payBy) {
        this.$alert("Please select network first.");
        return false;
      }
      return true;
    },
    getChainId(type) {
      if (type == "Polygon") return this.$inDev ? 80001 : 137;
      if (type == "BSC") return this.$inDev ? 97 : 56;
      if (type == "Arbitrum") return 42161;
      if (type == "zkSync") return this.$inDev ? 280 : 324;
      if (type == "everPay") return this.$inDev ? 5 : 1;
      return this.$inDev ? 5 : 1;
    },
    async addChain(chainId, id) {
      let params = {
        137: {
          chainId,
          chainName: "Polygon Mainnet",
          rpcUrls: [
            "https://polygon.llamarpc.com",
            // "https://polygon-rpc.com",
          ],
          nativeCurrency: {
            name: "Polygon Coin",
            symbol: "MATIC",
            decimals: 18,
          },
          blockExplorerUrls: ["https://polygonscan.com"],
        },
        5: {
          chainId,
          chainName: "Goerli Testnet",
          rpcUrls: ["https://rpc.ankr.com/eth_goerli"],
          nativeCurrency: {
            name: "Goerli-ETH",
            symbol: "G-ETH",
            decimals: 18,
          },
          blockExplorerUrls: ["https://goerli.etherscan.io/"],
        },
        56: {
          chainId,
          chainName: "BSC Mainnet",
          rpcUrls: ["https://rpc.ankr.com/bsc"],
          nativeCurrency: {
            name: "Binance Coin",
            symbol: "BNB",
            decimals: 18,
          },
          blockExplorerUrls: ["https://bscscan.com"],
        },
        80001: {
          chainId,
          chainName: "polygon mumbai",
          rpcUrls: ["https://rpc.ankr.com/polygon_mumbai"],
          nativeCurrency: {
            name: "matic Coin",
            symbol: "MATIC",
            decimals: 18,
          },
          // blockExplorerUrls: [],
        },
        97: {
          chainId,
          chainName: "BSC Chapel",
          rpcUrls: ["https://bsc-testnet.public.blastapi.io"],
          nativeCurrency: {
            name: "BNB Coin",
            symbol: "tBNB",
            decimals: 18,
          },
          // blockExplorerUrls: [],
        },
        42161: {
          chainId,
          chainName: "Arbitrum One",
          rpcUrls: ["https://arb1.arbitrum.io/rpc"],
          nativeCurrency: {
            name: "zkSync Coin",
            symbol: "ETH",
            decimals: 18,
          },
          // blockExplorerUrls: [],
        },
        280: {
          chainId,
          chainName: "zkSync Era Testnet",
          rpcUrls: ["https://testnet.era.zksync.dev"],
          nativeCurrency: {
            name: "zkSync Coin",
            symbol: "ETH",
            decimals: 18,
          },
          // blockExplorerUrls: [],
        },
        324: {
          chainId,
          chainName: "zkSync Era Mainnet",
          rpcUrls: ["https://mainnet.era.zksync.io"],
          nativeCurrency: {
            name: "zkSync Coin",
            symbol: "ETH",
            decimals: 18,
          },
          // blockExplorerUrls: [],
        },
      }[id];
      if (!params) return;
      try {
        await this.walletObj.request(
          {
            method: "wallet_addEthereumChain",
            params: [params],
          },
          this.connectAddr
        );
      } catch (error) {
        console.log("add chain err", error);
      }
    },
    async switchNet(id) {
      const chainId = "0x" + id.toString(16);
      try {
        const res = await window.web3.currentProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
        console.log("switch err 1", res);
        if (res && res.error) {
          throw new Error(res.error);
        }
      } catch (error) {
        console.log("switch error 2", error);
        if (error.code !== 4902) {
          this.onErr(error).then(() => {
            // this.switchNet(id);
            this.$setState({
              payBy: null,
            });
            localStorage.payBy = "";
          });
        } else {
          this.addChain(chainId, id);
        }
      }
    },
    addHash(tx, usdt, contentType = "Purchase") {
      const obj = {
        hash: typeof tx == "string" ? tx : tx.blockHash,
        contentType,
        // network: this.payBy,
        paymentTime: parseInt(Date.now() / 1e3),
        usdt,
        status: "Pending",
      };
      localStorage.lastHash = JSON.stringify(obj);
    },
    async switchPolygon() {
      let html = `Currently, deposits and withdrawals are only supported on the Polygon network. `;
      html += "<p>Would you like to switch to the Polygon network?</p>";
      await this.$confirm(html, this.title, {
        confirmText: "Switch Network",
      });
      this.payBy = localStorage.payBy = "Polygon";
      const id = this.getChainId(this.payBy);
      await this.switchNet(id);
    },
    async switchMatchNet(payBy) {
      const id = this.getChainId(payBy);
      await this.switchNet(id);
    },

    async onConnect() {
      // this.walletChanged(true);
      try {
        if (this.chainId != this.payChainId) {
          // let dev = "";
          // if (this.$inDev) {
          //   dev = this.isPolygon ? "Mumbai" : "Goerli";
          //   if (this.isBSC) dev = "Chapel";
          //   if (this.isZk) dev = "zkSync";
          //   dev = `(dev - ${dev})`;
          // }
          // console.log(this.payChainId);
          // await this.$alert(`Please switch to ${this.payBy}${dev} Network`);
          await this.switchNet(this.payChainId);
          return;
        }
        const provider = new providers.Web3Provider(this.walletObj);
        if (this.isPolygon) {
          polygonContract.setProvider(provider);
          this.curContract = polygonContract;
        } else if (this.isBSC) {
          bscContract.setProvider(provider);
          this.curContract = bscContract;
        } else if (this.isArbitrum) {
          ArbitrumContract.setProvider(provider);
          this.curContract = ArbitrumContract;
        } else if (this.isZk) {
          const provider = new Web3Provider(this.walletObj);
          zkSyncContract.setProvider(provider);
          this.curContract = zkSyncContract;
        } else {
          ethContract.setProvider(provider);
          this.curContract = ethContract;
        }
        const addr = this.isSubscribe ? this.payAddr : this.rechargeAddr;
        this.allowance = await this.curContract[this.usdcKey].allowance(
          this.connectAddr,
          addr
        );

        // this.getSign();
        if (this.needCheckApprove) {
          this.checkApprove(this.isSubscribe);
        }
      } catch (error) {
        console.log("on connect error");
        this.$alert(error.message).then(() => {
          location.reload();
        });
      }
    },
    async registerSuccess(txh) {
      try {
        await this.$http.post("$auth/self-handled-register", {
          txn: txh ?? "",
        });
        this.$setMsg("updateUser");
      } catch (error) {
        console.log(error);
      }
    },
  },
};
