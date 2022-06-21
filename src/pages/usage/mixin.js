import { mapState } from "vuex";
import { providers, BigNumber } from "ethers"; //, utils
import srccontracts from "../../plugins/pay/contracts/src-chain-contracts";
import dstcontracts from "../../plugins/pay/contracts/dst-chain-contracts";
import client from "../../plugins/pay/contracts/SGNClient";

const uint256Max = BigNumber.from("1").shl(256).sub(1);

export default {
  data() {
    return {
      curContract: null,
      isApproved: false,
      providerAddr: "0xF1658C608708172655A8e70a1624c29F956Ee63D",
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
    uuid() {
      const { uid } = this.userInfo;
      if (!uid) return;
      return "0x" + uid.replace("0x", "").padStart(64, "0");
    },
    isPolygon() {
      return this.payBy == "Polygon";
    },
    payChainId() {
      if (this.isPolygon) return this.$inDev ? 80001 : 137;
      return this.$inDev ? 5 : 1;
    },
    usdcKey() {
      return this.isPolygon ? "MumbaiUSDC" : "GoerliUSDC";
    },
    payAddr() {
      if (!this.curContract) return "";
      return this.curContract[
        this.isPolygon ? "DstChainPayment" : "SrcChainPayment"
      ].address;
    },
  },
  watch: {
    connectAddr(val) {
      if (val) this.onConnect();
    },
    payChainId() {
      this.onConnect();
    },
  },
  mounted() {
    if (this.connectAddr) {
      this.onConnect();
    } else {
      this.showConnect();
    }
  },
  methods: {
    async checkApprove() {
      try {
        console.log("check approve", this.connectAddr, this.payAddr);
        const allowance = await this.curContract[this.usdcKey].allowance(
          this.connectAddr,
          this.payAddr
        );
        const minAllowance = uint256Max.shr(1);
        this.isApproved = !allowance.lt(minAllowance);
        console.log("isApproved", this.isApproved, allowance);
      } catch (error) {
        console.log(error);
        this.$alert(error.message);
      }
    },
    async onApprove() {
      try {
        this.$loading("Approving");
        const tx = await this.curContract[this.usdcKey].approve(
          this.paymentAddr,
          uint256Max
        );
        console.log("tx", tx);
        const receipt = await tx.wait();
        console.log(receipt);
        this.isApproved = true;
        this.$loading.close();
      } catch (error) {
        console.log(error);
        this.$alert(error.message);
      }
    },
    formatToken(value, fixed = 2, decimals = 18) {
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
    async getSign() {
      try {
        const { data } = await this.$http.post(
          "$v3/common/sign/" + this.connectAddr
        );
        console.log("sign", data);
      } catch (error) {
        console.log(error);
      }
    },
    async onConnect() {
      console.log(this.chainId, client);
      try {
        if (this.chainId != this.payChainId) {
          const dev = this.$inDev
            ? `(dev-${this.Polygon ? "Mumbai" : "Goerli"})`
            : "";
          await this.$alert(`Please switch to ${this.payBy}${dev} Network`);
          await window.web3.currentProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + this.payChainId.toString(16) }],
          });
          return;
        }
        const provider = new providers.Web3Provider(window.ethereum);
        if (this.isPolygon) {
          dstcontracts.setProvider(provider);
          this.curContract = dstcontracts;
        } else {
          srccontracts.setProvider(provider);
          this.curContract = srccontracts;
        }
        console.log(this.payBy, this.curContract);
        // this.getSign();
        this.checkApprove();
      } catch (error) {
        this.$alert(error.message).then(() => {
          this.$router.push("/usage/info");
        });
      }
    },
  },
};
