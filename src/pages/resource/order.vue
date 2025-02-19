<template>
  <div>
    <div class="al-end d-flex fz-14 gray">
      <span class="gray-6 fz-14">Pending order</span>
      <!-- <span class="ml-auto">Total:</span> -->
      <!-- <span class="fz-16 color-1 ml-2 mr-1">{{ totalPrice }}</span>
      <span class="gray">USDC</span> -->
    </div>
    <div class="ov-a">
      <table class="w100p e-table-1 mt-4 fz-14">
        <thead class="bg-f7 gray-6">
          <tr>
            <td>#</td>
            <td>Type</td>
            <td>Resource</td>
            <td>Specification</td>
            <td>Amount</td>
          </tr>
        </thead>
        <tbody v-if="list">
          <tr v-for="(it, i) in list" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ it.type }}</td>
            <td>{{ it.label }}</td>
            <td>{{ it.value }}</td>
            <td>{{ $utils.cutFixed(it.price, 4) }} USDC</td>
          </tr>
        </tbody>
      </table>
    </div>

    <e-kv2 class="mt-6" label="Network" v-if="onChain != null">
      <pay-network :allow="allowNetwork" ref="payNetwork" />
    </e-kv2>

    <div class="mt-8 gray fz-14">
      To complete the transaction with ETH and BSC payments, the platform will
      automatically cross-chain to Polygon. To prevent insufficient gas fees,
      maintaining a minimum payment amount of 20U is required.
    </div>
    <h3 class="mt-10">Redeem a Credit</h3>
    <v-row>
      <v-col sm="8" cols="12" class="d-flex al-start">
        <div class="flex-1">
          <v-text-field
            class="post-input hide-msg"
            persistent-placeholder
            v-model="voucherCode"
            outlined
            dense
            :disabled="AmountofDeduction > 0"
            placeholder="Enter the credit code"
          >
          </v-text-field>
          <decode-status
            v-if="showDecode"
            :statusText="statusText"
            :status="validStatus"
            class="mt-3"
          />
        </div>
        <v-btn
          color="primary"
          class="ml-7"
          width="140"
          v-if="!AmountofDeduction"
          :disabled="disabled"
          tile
          @click="handleCommit"
          >Confirm</v-btn
        >
        <v-btn
          v-else
          outlined
          class="ml-7"
          width="140"
          tile
          @click="handleCancelVoucher"
          >Cancel</v-btn
        >
      </v-col>
    </v-row>

    <div class="al-c flex-wrap">
      <div
        class="reward-voucher mr-6 mt-5"
        v-for="item in rewardVoucherList"
        :key="item.code"
      >
        <div class="left fz-12">
          You have an unclaimed
          <p class="my-0 fw-b">{{ item.remark }}</p>
          voucher.
        </div>
        <div class="right">
          <v-btn
            small
            color="primary"
            elevation="0"
            @click="handleClaimVoucher(item)"
            >Claim</v-btn
          >
        </div>
      </div>
    </div>

    <v-dialog
      v-model="showPop"
      max-width="550"
      v-if="rewardVoucherInfo"
      persistent
    >
      <div class="pa-6">
        <h3>{{ rewardVoucherInfo.remark }}</h3>
        <div class="pa-4">
          Please save your voucher information carefully, as this message will
          not appear again after claimed.
        </div>
        <ul class="voucher-info fz-14 pl-0">
          <li>
            <div class="voucher-label gray">Voucher Type</div>
            <div>Gift Voucher</div>
          </li>
          <li>
            <div class="voucher-label gray">Expiry Date</div>
            <div>
              {{ new Date(rewardVoucherInfo.expiredAt).format("date") }}
            </div>
          </li>
          <li>
            <div class="voucher-label gray">Voucher Amount</div>
            <div>{{ rewardVoucherInfo.amount }} USDC</div>
          </li>
          <li>
            <div class="voucher-label gray">Voucher Code</div>
            <div>{{ rewardVoucherInfo.code }}</div>
          </li>
        </ul>
        <div class="al-c justify-center mt-8">
          <v-btn class="mx-auto" @click="showPop = false">Cancel</v-btn>
          <v-btn color="primary" class="mx-auto" @click="handleCopy"
            >Copy and claim</v-btn
          >
        </div>
      </div>
    </v-dialog>
    <div style="height: 20vh"></div>

    <pay-confirm
      label="Configuration costs"
      :price="totalPrice"
      :text="isApproved ? 'Confirm' : 'Approve'"
      :loading="approving"
      :symbol="symbol"
      @submit="onSubmit"
    >
      <template #evepay v-if="payBy == 'everPay' && allowEverPay">
        <div class="mt-2 bdrs-6 fz-12 gray mb-2" style="bottom: 70px">
          Purchase resources using {{ symbol }} from your everPay
          <span
            class="cursor-p"
            style="color: #775da6"
            @click="handleCheckSymbol"
            >Switch</span
          >
        </div>
      </template>
      <template #detail v-if="AmountofDeduction">
        <div>
          <span class="fz-14 gray-6 label">Credit:</span>
          <span class="black-1 fz-25 ml-3">-{{ AmountofDeduction }}</span>
          <span class="gray-6 ml-2 fz-15">{{ symbol }}</span>
        </div>
        <div>
          <span class="fz-14 gray-6 label">Total:</span>
          <span class="red-1 fz-25 ml-3">{{ finalPrice }}</span>
          <span class="gray-6 ml-2 fz-15">{{ symbol }}</span>
        </div>
      </template>
    </pay-confirm>
  </div>
</template>

<script>
import PayNetwork from "@/views/pay/pay-network";
import PayConfirm from "@/views/pay/pay-confirm";
import mixin from "@/views/pay/mixin";
import { mapState } from "vuex";
import { BigNumber } from "@ethersproject/bignumber";
import { bus } from "../../utils/bus";
import { getProvider } from "@/plugins/ens";
import { utils } from "ethers";
export default {
  mixins: [mixin],
  data() {
    return {
      isSubscribe: true,
      voucherCode: "",
      disabled: false,
      showDecode: false,
      statusText: {
        1: "Checking availability...",
        2: "Available!",
        3: "Unavailable！",
      },
      validStatus: 1,
      AmountofDeduction: 0,
      resourceResource: null,
      needCheckApprove: true,
      symbol: "USDC",
      curEveypayChannel: null,
      allowEverPay: false,
      showPop: false,
      rewardVoucherInfo: null,
      rewardVoucherList: [],
    };
  },
  computed: {
    ...mapState({
      totalPrice: (s) => s.orderInfo.totalPrice,
      list: (s) => s.orderInfo.list,
      orderInfo: (s) => s.orderInfo,
      userInfo: (s) => s.userInfo,
      onChain: (s) => s.onChain,
      payBy: (s) => s.payBy,
      teamId: (s) => s.teamId,
    }),
    finalPrice() {
      return this.totalPrice - this.AmountofDeduction >= 0
        ? (this.totalPrice - this.AmountofDeduction).toFixed(4)
        : "0.00";
    },
    allowNetwork() {
      if (this.onChain) {
        // return ["Polygon", "Ethereum", "BSC"];
        if (this.$inDev) {
          return ["Polygon", "Ethereum", "BSC", "zkSync", "everPay"];
        }
        return ["Polygon", "Ethereum", "BSC", "Arbitrum", "zkSync", "everPay"];
      } else {
        return ["Polygon"];
      }
    },
  },
  created() {
    if (!this.list) this.$router.replace("/resource/subscribe");
    this.checkHaveVoucher();
    bus.$on("everPayChannel", async (curEveypayChannel) => {
      this.curEveypayChannel = curEveypayChannel;
      let finalPrice = this.getFinalPrice();
      let balance = utils.parseEther(curEveypayChannel.balance.toString());
      if (balance.gte(finalPrice)) {
        this.$refs.payNetwork.$refs.everPay.allowPay = true;
        this.$refs.payNetwork.$refs.everPay.showEverPay = false;
        this.symbol = curEveypayChannel.symbol;
        this.allowEverPay = true;
      } else {
        this.$alert(
          "Insufficient balance, please deposit and try again.",
          "alert"
        );
      }
    });
  },
  beforeDestroy() {
    bus.$off("everPayChannel");
  },
  methods: {
    async onSubmit(isPreview) {
      try {
        if (!this.checkPayBy()) return;
        if (this.payBy == "everPay") {
          return await this.everPaySubmit();
        }
        const target = this.curContract[this.chainKey];
        if (!target) {
          return this.onConnect();
        }
        if (!this.isApproved) {
          return this.onApprove(true);
        }
        const form = this.orderInfo.feeForm;
        const payloads = [];
        let totalFee = null;
        for (const key in form) {
          let val = form[key];
          if (!val) continue;
          const values = Array.isArray(val)
            ? val.map((it) => BigNumber.from(it))
            : [BigNumber.from(val)];
          for (const fee of values) {
            totalFee = totalFee ? totalFee.add(fee) : fee;
          }
          payloads.push({
            resourceType: key,
            values,
          });
        }
        if (!totalFee) {
          throw new Error("No Fee");
        }
        this.ethFeeInfo = null;
        this.$loading();
        let params = [this.providerAddr, this.uuid, payloads];
        const nonce = this.resourceResource ? this.resourceResource.nonce : 0;
        const amount = this.resourceResource
          ? this.resourceResource.voucherAmount
          : 0;
        const signature = this.resourceResource
          ? this.resourceResource.sign
          : "0x";
        let resourceParams = [nonce, amount, signature];
        params = params.concat(resourceParams);
        if (!this.isPolygon) {
          if (this.chainId != 56) {
            totalFee = totalFee.div(1e12);
          }
          console.log("totalFee", totalFee.toString());
          console.log(params, "calcFee params");
          if (this.isZk) {
            let gas = await target.estimateGas.pay(...params);
            console.log("gas", gas);
            let gasPrice = await this.curContract.provider.getGasPrice();
            params.push({
              gasLimit: gas.mul(15).div(10),
              gasPrice: gasPrice.mul(12).div(10),
            });
          } else {
            const feeMsg = await target.calcFee(...params);
            console.log("feeMsg", feeMsg.toString());
            let gas = await target.estimateGas.pay(...params, {
              value: feeMsg,
            });
            console.log("gas", gas);
            let gasPrice = await this.curContract.provider.getGasPrice();
            params.push({
              value: feeMsg,
              gasLimit: gas.mul(15).div(10),
              gasPrice: gasPrice.mul(12).div(10),
            });
            this.ethFeeInfo = {
              msgFee: this.$utils.cutFixed(feeMsg.toString() / 1e18, 4),
              unit: this.isBSC ? "BNB" : "ETH",
            };
            console.log(this.ethFeeInfo);
          }
          if (isPreview) {
            return;
          }
        }
        console.log("pay", params, this.curContract[this.chainKey]);
        const accountExists =
          await this.curContract.ProviderController.accountExists(
            this.providerAddr,
            this.uuid
          );
        console.log(accountExists, "accountExists");
        let tx = null;
        if (accountExists) {
          tx = await target.pay(...params);
        } else {
          const { sign } = await this.getSignAddress();
          tx = await target.payWithRegistration(...params, sign);
        }
        console.log("tx", tx);
        const receipt = await tx.wait(1);
        this.addHash(tx, this.totalPrice);
        console.log("receipt", receipt);
        if (!accountExists) {
          await this.registerSuccess();
        }
        this.$loading.close();
        await this.$alert(
          "Successful transaction! The resource release time is based on on-chain data."
        );
        this.$router.replace({
          path: "/resource/bills",
          query: {
            typeIdx: this.isPolygon ? 0 : 1,
          },
        });
        localStorage.orderInfo = "";
      } catch (error) {
        console.log("pay submit error");
        this.$loading.close();
        this.onErr(error);
      }
    },
    getFinalPrice() {
      const form = this.orderInfo.feeForm;
      const values = [];
      let totalFee = null;
      for (const key in form) {
        let val = form[key];
        if (!val) continue;
        Array.isArray(val)
          ? val.forEach((it) => values.push(BigNumber.from(it)))
          : values.push(BigNumber.from(val));
      }
      for (const fee of values) {
        totalFee = totalFee ? totalFee.add(fee) : fee;
      }
      const voucherAmount = this.resourceResource
        ? this.resourceResource.voucherAmount
        : "";
      let finalPrice = null;
      if (voucherAmount != "") {
        const voucherAmountFee = BigNumber.from(voucherAmount);
        finalPrice = totalFee.sub(voucherAmountFee).isNegative()
          ? BigNumber.from("0")
          : totalFee.sub(voucherAmountFee);
      } else {
        finalPrice = totalFee;
      }
      return finalPrice;
    },
    async everPaySubmit() {
      try {
        this.$loading();
        const provider = getProvider();
        const signer = provider.getSigner();
        const account = await signer.getAddress();
        const nonce = this.resourceResource ? this.resourceResource.nonce : "";
        const voucherAmount = this.resourceResource
          ? this.resourceResource.voucherAmount
          : "";
        const signature = this.resourceResource
          ? this.resourceResource.sign
          : "";
        const jsonData = {
          account: this.teamId,
          nonce,
          signature,
          voucherAmount,
          payloads: [],
        };
        const form = this.orderInfo.feeForm;
        for (const key in form) {
          let val = form[key];
          if (!val) continue;
          jsonData.payloads.push({
            resourceType: key,
            values: Array.isArray(form[key])
              ? form[key].map((it) => BigNumber.from(it).toString())
              : [BigNumber.from(form[key]).toString()],
          });
        }
        let finalPrice = this.getFinalPrice();
        if (this.symbol == "DAI") {
          finalPrice = utils.formatEther(finalPrice);
        } else {
          finalPrice = utils.formatUnits(finalPrice.div(10 ** 12), 6);
        }
        // console.log(finalPrice, jsonData, "jsondata");
        const everpay = new window.Everpay.default({
          account,
          chainType: "ethereum",
          ethConnectedSigner: signer,
        });
        const data = await everpay.transfer({
          tag: this.curEveypayChannel.tag,
          amount: finalPrice,
          to: this.$inDev
            ? "0xd8b38301655FaeE94C43f7121189E3E0f8973dd0"
            : "0xb7B4360F7F6298dE2e7a11009270F35F189Bd77E",
          data: jsonData,
        });

        this.$loading.close();
        await this.$alert(
          "Successful transaction! The resource release time is based on on-chain data."
        );
        this.$router.replace({
          path: "/resource/bills",
          query: {
            typeIdx: this.isPolygon ? 0 : 1,
          },
        });
        localStorage.orderInfo = "";
        console.log(data);
      } catch (error) {
        console.log("pay submit error");
        this.$loading.close();
        this.onErr(error);
      }
    },
    async handleCommit() {
      try {
        if (!this.voucherCode) return;
        this.disabled = true;
        this.validStatus = 1;
        this.showDecode = true;
        const { data } = await this.$http(
          `$resource/rewardhub/voucher/verify/${this.voucherCode}`,
          {
            noTip: 1,
          }
        );
        this.AmountofDeduction = JSON.parse(data.voucherLimit).USDC;
        if (data.voucherType == 1) {
          throw new Error(
            "Unavailable! This is a resource voucher, please enter a credit code."
          );
        }
        this.resourceResource = data;
        this.validStatus = 2;
        this.statusText[2] = `Available! Expires: ${new Date(
          data.expiredTime * 1000
        ).format("date")}`;
      } catch (error) {
        // console.log(error);
        this.validStatus = 3;
        this.statusText[3] = error.message;
      }
      this.disabled = false;
    },
    async handleCancelVoucher() {
      this.showDecode = false;
      this.validStatus = 1;
      this.voucherCode = "";
      this.AmountofDeduction = 0;
      this.resourceResource = null;
    },
    async getSignAddress() {
      try {
        const { data } = await this.$http.get(
          "$auth/self-handled-register-sign-from-server"
        );
        return data;
      } catch (error) {
        console.log(error);
      }
    },
    handleCheckSymbol() {
      this.$refs.payNetwork.$refs.everPay.showEverPay = true;
    },

    async checkHaveVoucher() {
      try {
        const { data } = await this.$http.get("$auth/vouchers");
        this.rewardVoucherList = data;
      } catch (error) {
        console.log(error);
      }
    },
    async handleClaimVoucher(item) {
      this.rewardVoucherInfo = item;
      this.showPop = true;
    },
    async handleCopy() {
      try {
        await this.$http.post("$auth/vouchers/claim", {
          code: this.rewardVoucherInfo.code,
          activity: this.rewardVoucherInfo.activity,
        });
        await this.checkHaveVoucher();
        this.$copy(this.rewardVoucherInfo.code);
        this.voucherCode = this.rewardVoucherInfo.code;
        this.showPop = false;
      } catch (error) {
        console.log(error);
      }
    },
  },
  components: {
    PayNetwork,
    PayConfirm,
  },
  watch: {
    payBy(val) {
      if (val != "everPay") {
        this.symbol = "USDC";
        this.allowEverPay = false;
      }
    },
  },
};
</script>
<style lang="scss" scoped>
.label {
  display: inline-block;
  min-width: 130px;
  text-align: right;
}
.reward-voucher {
  position: relative;
  width: 320px;
  height: 104px;
  background: url("/img/bg/resource/voucher-bg.png") no-repeat;
  background-size: 100% 100%;
  > div {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }
  .left {
    left: 20px;
    width: 200px;
  }
  .right {
    right: 0;
    padding: 20px 27px;
    border-left: 2px dashed #735ea1;
  }
}
.voucher-info {
  li {
    display: flex;
    padding-left: 20px;
    align-items: center;
    // justify-content: center;
    .voucher-label {
      min-width: 150px;
    }
  }
  li + li {
    margin-top: 8px;
  }
}
</style>
